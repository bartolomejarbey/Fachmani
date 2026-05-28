/**
 * cookieConsent.ts
 * ================
 * Jednotná správa souhlasu s cookies (GDPR / ePrivacy).
 *
 * Princip: kategorie „nezbytné" jsou vždy aktivní (právní základ = oprávněný
 * zájem / nutnost plnění), souhlas se vyžaduje POUZE pro analytické a
 * marketingové cookies. Souhlas se ukládá s časovým razítkem a verzí, takže
 * při změně rozsahu cookies (CONSENT_VERSION) se banner zobrazí znovu.
 *
 * Žádné skripty třetích stran zatím nenačítáme — tato vrstva je připravená
 * tak, aby šlo budoucí skripty podmínit přes `getConsent()` / event
 * `CONSENT_EVENT`. Souhlas nezbytný k zobrazení banneru = absence záznamu
 * nebo neshoda verze.
 */

export const CONSENT_VERSION = 1;
const STORAGE_KEY = "fachmani-cookie-consent";

/** Custom event vyvolaný při každé změně souhlasu (i z jiné komponenty). */
export const CONSENT_EVENT = "fachmani:cookie-consent-change";
/** Event, kterým lze odkudkoli (footer, /cookies) znovu otevřít nastavení. */
export const OPEN_SETTINGS_EVENT = "fachmani:open-cookie-settings";

export type ConsentCategories = {
  /** Vždy true — web bez nich nefunguje. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentRecord = {
  version: number;
  /** ISO 8601 čas udělení/aktualizace souhlasu. */
  timestamp: string;
  categories: ConsentCategories;
};

export const DEFAULT_CATEGORIES: ConsentCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/** Načte uložený souhlas. Vrací null, pokud chybí nebo neodpovídá verze. */
export function getConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True, pokud uživatel již platně rozhodl (a nepotřebujeme banner). */
export function hasValidConsent(): boolean {
  return getConsent() !== null;
}

/** Uloží souhlas, vyvolá CONSENT_EVENT. `necessary` je vždy vynuceno na true. */
export function setConsent(categories: Omit<ConsentCategories, "necessary"> & { necessary?: boolean }): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: {
      necessary: true,
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
    },
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* storage nedostupné (private mode) — souhlas platí jen pro tuto relaci */
    }
    window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: record }));
  }
  return record;
}

/** Otevře panel nastavení cookies odkudkoli (např. z footeru). */
export function openCookieSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  }
}
