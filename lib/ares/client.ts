// ARES klient — REST v3 (MF ČR, veřejné)
// Endpoint: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
// Dokumentace: https://ares.gov.cz/swagger-ui

import { isValidIco } from "./validate";

const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";
const REQUEST_TIMEOUT_MS = 5000;
// 3 retries po iniciálním pokusu = celkem 4 attempty; exponenciální backoff 500/1000/2000ms.
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 500;

export type StructuredAddress = {
  street: string | null;
  house_number: string | null;
  orientation_number: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
};

export type AresOk = {
  status: "ok";
  ico: string;
  name: string;
  legalForm: string | null;
  dic: string | null;
  address: string | null;
  structuredAddress: StructuredAddress | null;
  datumVzniku: string | null;
  datumZaniku: string | null;
  registrationStates: Record<string, string>;
  raw: unknown;
};

export type AresInactive = {
  status: "inactive";
  ico: string;
  name: string | null;
  reason: "deleted" | "never_active";
  datumZaniku: string | null;
  registrationStates: Record<string, string>;
  raw: unknown;
};

export type AresResult =
  | AresOk
  | AresInactive
  | { status: "not_found"; ico: string }
  | { status: "error"; ico: string; message: string };

const REGISTRATION_KEYS = [
  "stavZdrojeVr",
  "stavZdrojeRzp",
  "stavZdrojeRos",
  "stavZdrojeCeu",
  "stavZdrojeRs",
] as const;

function extractRegistrationStates(seznamRegistraci: unknown): Record<string, string> {
  if (!seznamRegistraci || typeof seznamRegistraci !== "object") return {};
  const s = seznamRegistraci as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of REGISTRATION_KEYS) {
    const v = s[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  // include stavZdrojeRes for diagnostic but NOT for the activity decision
  if (typeof s.stavZdrojeRes === "string" && s.stavZdrojeRes.length > 0) {
    out.stavZdrojeRes = s.stavZdrojeRes;
  }
  return out;
}

/**
 * Aktivní subjekt = nemá datumZaniku a alespoň jeden z primárních rejstříků
 * (VR, RZP, ROS, CEU, RS) je AKTIVNI. RES (statistický rejstřík) ignorujeme —
 * zůstává AKTIVNI i u zaniklých subjektů.
 */
export function isAresSubjectActive(
  datumZaniku: string | null,
  registrationStates: Record<string, string>
): { active: true } | { active: false; reason: "deleted" | "never_active" } {
  if (datumZaniku) return { active: false, reason: "deleted" };
  for (const key of REGISTRATION_KEYS) {
    if (registrationStates[key] === "AKTIVNI") return { active: true };
  }
  return { active: false, reason: "never_active" };
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const combinedSignal = signal
      ? abortSignalAny([controller.signal, signal])
      : controller.signal;
    return await fetch(url, {
      signal: combinedSignal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function abortSignalAny(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function parseAddress(sidlo: unknown): { display: string | null; structured: StructuredAddress | null } {
  if (!sidlo || typeof sidlo !== "object") return { display: null, structured: null };
  const s = sidlo as Record<string, unknown>;
  const ulice = (s.nazevUlice as string | undefined) ?? null;
  const cp = s.cisloDomovni as number | string | undefined;
  const co = s.cisloOrientacni as number | string | undefined;
  const obec = (s.nazevObce as string | undefined) ?? null;
  const psc = s.psc as number | string | undefined;
  const stat = (s.nazevStatu as string | undefined) ?? null;

  const structured: StructuredAddress = {
    street: ulice || null,
    house_number: cp !== undefined && cp !== null ? String(cp) : null,
    orientation_number: co !== undefined && co !== null ? String(co) : null,
    city: obec,
    postal_code: psc !== undefined && psc !== null ? String(psc) : null,
    country: stat,
  };

  const parts: string[] = [];
  const street =
    (ulice ? `${ulice}` : "") +
    (cp ? ` ${cp}${co ? `/${co}` : ""}` : "");
  if (street.trim()) parts.push(street.trim());
  if (obec) parts.push(psc ? `${psc} ${obec}` : obec);

  return {
    display: parts.length > 0 ? parts.join(", ") : null,
    structured: ulice || obec || psc ? structured : null,
  };
}

export async function lookupAres(icoInput: string): Promise<AresResult> {
  const ico = (icoInput || "").replace(/\D+/g, "");
  if (!isValidIco(ico)) {
    return { status: "error", ico, message: "Neplatné IČO (kontrolní číslice)." };
  }

  const url = `${ARES_BASE}/${ico}`;
  let lastErr = "Neznámá chyba";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.status === 404) {
        return { status: "not_found", ico };
      }
      if (res.status === 429 || res.status >= 500) {
        lastErr = `ARES dočasně nedostupné (HTTP ${res.status}).`;
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        return { status: "error", ico, message: lastErr };
      }
      if (!res.ok) {
        return { status: "error", ico, message: `ARES chyba (HTTP ${res.status}).` };
      }

      const data = (await res.json()) as Record<string, unknown>;
      const name = (data.obchodniJmeno as string) || null;
      if (!name) {
        return { status: "not_found", ico };
      }

      const datumVzniku = (data.datumVzniku as string) || null;
      const datumZaniku = (data.datumZaniku as string) || null;
      const registrationStates = extractRegistrationStates(data.seznamRegistraci);
      const activity = isAresSubjectActive(datumZaniku, registrationStates);

      if (!activity.active) {
        return {
          status: "inactive",
          ico,
          name,
          reason: activity.reason,
          datumZaniku,
          registrationStates,
          raw: data,
        };
      }

      const parsed = parseAddress(data.sidlo);
      return {
        status: "ok",
        ico,
        name,
        legalForm: (data.pravniForma as string) || null,
        dic: (data.dic as string) || null,
        address: parsed.display,
        structuredAddress: parsed.structured,
        datumVzniku,
        datumZaniku,
        registrationStates,
        raw: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErr = msg.includes("abort") ? "ARES timeout." : `ARES chyba: ${msg}`;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  return { status: "error", ico, message: lastErr };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
