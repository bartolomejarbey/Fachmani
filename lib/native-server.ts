import { headers } from "next/headers";

/**
 * Server-side detekce běhu uvnitř iOS aplikace (Capacitor).
 * Nativní WKWebView má v User-Agent marker „FachmaniApp-iOS"
 * (capacitor.config.ts → ios.appendUserAgent).
 *
 * Používá se pro SSR stránky a API routes, kde klientský `isIOSNative()`
 * nestačí — zejména pro vypnutí ghost/seed profilů a AI obsahu na iOS
 * kvůli App Store pravidlům (fiktivní/cizí obsah, nemoderovaná AI).
 */
export async function isIosAppRequest(): Promise<boolean> {
  try {
    const ua = (await headers()).get("user-agent") || "";
    return ua.includes("FachmaniApp-iOS");
  } catch {
    return false;
  }
}

/** Varianta pro API route handlery, kde máme přístup k Request. */
export function isIosAppFromRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") || "";
  return ua.includes("FachmaniApp-iOS");
}
