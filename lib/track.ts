/**
 * Bezpečné odeslání konverzního eventu do Meta Pixelu.
 * Pokud pixel není načtený (blokovaný / souhlas), tiše neudělá nic.
 */
type Fbq = (action: string, event: string, params?: Record<string, unknown>) => void;

export function fbTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") {
    fbq("track", event, params);
  }
}
