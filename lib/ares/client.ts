// ARES klient — REST v3 (MF ČR, veřejné)
// Endpoint: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
// Dokumentace: https://ares.gov.cz/swagger-ui

import { isValidIco } from "./validate";

const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 300;

export type AresResult =
  | {
      status: "ok";
      ico: string;
      name: string;
      legalForm: string | null;
      dic: string | null;
      address: string | null;
      raw: unknown;
    }
  | { status: "not_found"; ico: string }
  | { status: "error"; ico: string; message: string };

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

function formatAddress(sidlo: unknown): string | null {
  if (!sidlo || typeof sidlo !== "object") return null;
  const s = sidlo as Record<string, unknown>;
  const parts: string[] = [];
  const ulice = s.nazevUlice as string | undefined;
  const cp = s.cisloDomovni as number | string | undefined;
  const co = s.cisloOrientacni as number | string | undefined;
  const obec = s.nazevObce as string | undefined;
  const psc = s.psc as number | string | undefined;

  const street =
    (ulice ? `${ulice}` : "") +
    (cp ? ` ${cp}${co ? `/${co}` : ""}` : "");
  if (street.trim()) parts.push(street.trim());
  if (obec) parts.push(psc ? `${psc} ${obec}` : obec);

  return parts.length > 0 ? parts.join(", ") : null;
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
          await sleep(RETRY_BACKOFF_MS * (attempt + 1));
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

      return {
        status: "ok",
        ico,
        name,
        legalForm: (data.pravniForma as string) || null,
        dic: (data.dic as string) || null,
        address: formatAddress(data.sidlo),
        raw: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErr = msg.includes("abort") ? "ARES timeout." : `ARES chyba: ${msg}`;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
    }
  }

  return { status: "error", ico, message: lastErr };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
