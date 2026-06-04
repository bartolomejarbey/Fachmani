"use client";

import { useEffect, useState } from "react";
import { isIOSNative } from "@/lib/native";

// S4.F4 — UI komponenta pro správu Web Push subscription.
// Render v profilu fachmana / dashboardu. Kontroluje podporu prohlížeče,
// stahuje VAPID klíč ze serveru, registruje SW a posílá subscription do API.

type Status = "loading" | "unsupported" | "denied" | "off" | "on" | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

export default function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Na iOS (Capacitor) web push (VAPID) v WKWebView nefunguje → skrýt; push řeší nativní APNs.
  const [native, setNative] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (isIOSNative()) { if (!cancelled) setNative(true); return; }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }

      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        const j = await keyRes.json().catch(() => ({}));
        setError(j.error || "VAPID klíč není dostupný.");
        setStatus("off");
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const subJson = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Chyba při registraci push.");
        setStatus("off");
        return;
      }
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (native) return null;

  if (status === "loading") {
    return <div className="text-sm text-gray-500">Načítám stav push notifikací…</div>;
  }

  if (status === "unsupported") {
    return (
      <div className="text-sm text-gray-500">
        Tento prohlížeč nepodporuje push notifikace. Pro mobilní notifikace zkuste Chrome nebo Edge.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={status === "on" ? unsubscribe : subscribe}
          disabled={busy || status === "denied"}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
            status === "on"
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg"
          }`}
        >
          {busy ? "Pracuji…" : status === "on" ? "🔕 Vypnout push" : "🔔 Zapnout push notifikace"}
        </button>
        {status === "on" && (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">aktivní</span>
        )}
        {status === "denied" && (
          <span className="text-xs text-red-600">
            Notifikace jsou zakázané v prohlížeči — povol je v nastavení stránky.
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
