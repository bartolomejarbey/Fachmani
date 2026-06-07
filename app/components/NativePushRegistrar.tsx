"use client";

import { useEffect } from "react";
import { isIOSNative, nativePlugin } from "@/lib/native";
import { supabase } from "@/lib/supabase";

/**
 * Registrace nativních push notifikací (APNs) v iOS aplikaci.
 * Běží jen uvnitř Capacitor iOS buildu — na webu/Androidu je no-op.
 *
 * Tok: požádá o povolení → register() → event 'registration' vrátí APNs token
 * → POST /api/push/register-device (uloží do device_tokens pro fan-out cron).
 * Tap na notifikaci ('pushNotificationActionPerformed') otevře přiložený odkaz.
 *
 * Mountuje se globálně v app/layout.tsx.
 */
export default function NativePushRegistrar() {
  useEffect(() => {
    if (!isIOSNative()) return;
    const Push = nativePlugin("PushNotifications");
    if (!Push) return;

    let cancelled = false;

    const registerToken = async (token: string) => {
      // Token ukládáme jen pro přihlášeného uživatele (endpoint vyžaduje auth).
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      try {
        await fetch("/api/push/register-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform: "ios" }),
        });
      } catch {
        /* offline / přihlásí se znovu příště — neblokujeme UI */
      }
    };

    (async () => {
      try {
        const perm = (await Push.requestPermissions()) as { receive?: string } | undefined;
        if (perm?.receive !== "granted") return;
        // Listener na úspěšnou registraci → APNs token
        await Push.addListener("registration", (token: { value?: string }) => {
          if (token?.value) void registerToken(token.value);
        });
        // Tap na notifikaci → otevřít odkaz z payloadu
        await Push.addListener(
          "pushNotificationActionPerformed",
          (action: { notification?: { data?: { url?: string } } }) => {
            const url = action?.notification?.data?.url;
            if (url) {
              try {
                const path = url.startsWith("http") ? new URL(url).pathname + new URL(url).search : url;
                window.location.assign(path);
              } catch {
                /* ignore malformed url */
              }
            }
          },
        );
        await Push.register();
      } catch {
        /* plugin nedostupný / uživatel odmítl — tiše ignorujeme */
      }
    })();

    return () => {
      cancelled = true;
      try {
        void Push.removeAllListeners?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return null;
}
