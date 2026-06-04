"use client";

/**
 * Detekce běhu uvnitř nativní iOS aplikace (Capacitor) a tenké přístupové funkce
 * k nativním pluginům přes injektovaný `window.Capacitor` bridge.
 *
 * Záměrně NEimportujeme @capacitor/core do webového bundlu — na iOS Capacitor
 * injektuje `window.Capacitor` (a Plugins) do WKWebView, takže stačí číst global.
 * Na webu i Androidu vrací vše bezpečné no-op hodnoty.
 *
 * Hlavní účel pro App Store compliance:
 *  - skrýt na iOS veškeré platby/nákupy digitálních funkcí (Comgate, „499 Kč", boosty)
 *    → žádné porušení 3.1.1 / anti-steering 3.1.3,
 *  - přepnout web push (VAPID, na iOS nefunkční) na nativní APNs.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
};

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Běží uvnitř jakékoli nativní Capacitor aplikace (iOS/Android)? */
export function isNativeApp(): boolean {
  const c = cap();
  return !!(c && c.isNativePlatform && c.isNativePlatform());
}

/** Běží konkrétně v nativní iOS aplikaci? (rozhoduje o skrytí plateb kvůli App Store) */
export function isIOSNative(): boolean {
  const c = cap();
  return !!(c && c.isNativePlatform && c.isNativePlatform() && c.getPlatform && c.getPlatform() === "ios");
}

/**
 * Smí se v tomto běhu zobrazovat nákup/úhrada digitálních funkcí (předplatné, kredity, boosty)?
 * Na iOS NE (App Store 3.1.1) — dokud nebude implementováno Apple IAP. Na webu ANO.
 */
export function canShowPurchases(): boolean {
  return !isIOSNative();
}

/** Přístup k nativnímu pluginu přes injektovaný bridge (nebo undefined na webu). */
export function nativePlugin(name: string): Record<string, (...args: unknown[]) => Promise<unknown>> | undefined {
  const c = cap();
  return c?.Plugins?.[name];
}
