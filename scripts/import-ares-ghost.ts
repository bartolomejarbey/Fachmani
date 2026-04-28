/**
 * import-ares-ghost.ts
 * =====================
 * Bootstrap script: stáhne všechny aktivní řemeslné subjekty z ARES přes
 * paginované REST API a upsertne do public.ghost_subjects.
 *
 * Spuštění:
 *   $ SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/import-ares-ghost.ts
 *
 * Volitelně:
 *   ARES_DRY_RUN=1        — jen logy, nic se nepíše do DB
 *   ARES_NACE_PREFIXES=43 — čárkou oddělené NACE prefixy (default = RELEVANT_NACE_PREFIXES)
 *   ARES_PAGE_SIZE=100    — velikost stránky (max 100 doporučeno, hard limit 1000 per query)
 *   ARES_THROTTLE_MS=200  — pauza mezi requesty (proti rate-limitu)
 *
 * Strategie (proč ne bulk dump):
 *   ARES nemá veřejný bulk XML/CSV dump. POST /ekonomicke-subjekty/vyhledat má
 *   tvrdý limit 1 000 výsledků per query — proto musíme dotazovat per 5-cif. NACE
 *   kód (3-4-cif. kódy nejsou indexované, 2-cif. sekce typicky vrací >1 000).
 *
 *   1. Stáhneme aktuální CzNace číselník z /ciselniky-nazevniky/vyhledat.
 *   2. Vyfiltrujeme 5-cif. kódy odpovídající RELEVANT_NACE_PREFIXES.
 *   3. Per kód: paginované volání /ekonomicke-subjekty/vyhledat (start=0, +100…).
 *   4. Per subjekt: aplikujeme isActive + relevantní NACE filtr (subjekt může mít
 *      více NACE — vyhodíme ho jen pokud žádný neodpovídá našim prefixům).
 *   5. Mapping NACE → category_ids, PSČ → district_id (přes psc_prefixes lookup).
 *   6. Batch upsert (1000 záznamů per batch) do ghost_subjects (onConflict: ico).
 *
 * Bezpečnostní poznámky:
 *   - Skript musí běžet se SUPABASE_SERVICE_ROLE_KEY (RLS by jinak blokoval insert).
 *   - První spuštění: ARES_DRY_RUN=1 + ARES_NACE_PREFIXES=4321 pro ověření.
 *   - Throttle 200 ms mezi calls — ARES nemá oficiální limit, ale spam nedělat.
 *   - Pokud nějaký 5-cif. NACE vrátí pocetCelkem > 1000, script to zaloguje a
 *     posune se dál (subjekty nad limit zůstanou neimportované — operator musí
 *     ten kód rozdělit ručně, např. po krajích).
 */

// @ts-nocheck — Supabase typed client se v scripts/ nesnáší se strict mode
import { createClient } from "@supabase/supabase-js";

// -------------------------------------------------------------------------
// Konfigurace
// -------------------------------------------------------------------------
const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest";
const ARES_VYHLEDAT = `${ARES_BASE}/ekonomicke-subjekty/vyhledat`;
const ARES_CISELNIK = `${ARES_BASE}/ciselniky-nazevniky/vyhledat`;

const RELEVANT_NACE_PREFIXES = [
  "41", "42", "43", "45",
  "9521", "9522", "9523", "9524", "9525", "9529",
  "8130", "8121", "9609",
];

const NACE_TO_CATEGORY_KEY: Record<string, string> = {
  "41": "stavebnictvi",
  "42": "stavebnictvi",
  "43": "stavebnictvi",
  "4321": "elektro",
  "4322": "instalater",
  "4331": "stavebnictvi",
  "4332": "stavebnictvi",
  "4333": "stavebnictvi",
  "4334": "stavebnictvi",
  "45": "automoto",
  "9521": "elektro",
  "9522": "elektro",
  "9523": "ostatni",
  "9524": "stavebnictvi",
  "9525": "ostatni",
  "9529": "ostatni",
  "8130": "zahrada",
  "8121": "uklid",
  "9609": "ostatni",
};

const BATCH_SIZE = 1000;
const PAGE_SIZE = Number(process.env.ARES_PAGE_SIZE ?? 100);
const THROTTLE_MS = Number(process.env.ARES_THROTTLE_MS ?? 200);
const DRY_RUN = process.env.ARES_DRY_RUN === "1";
const ARES_LIMIT_PER_QUERY = 1000;

const PREFIX_OVERRIDE = process.env.ARES_NACE_PREFIXES
  ? process.env.ARES_NACE_PREFIXES.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const ACTIVE_PREFIXES = PREFIX_OVERRIDE ?? RELEVANT_NACE_PREFIXES;

// -------------------------------------------------------------------------
// Typy
// -------------------------------------------------------------------------
type AresSubject = {
  ico: string;
  obchodniJmeno: string;
  pravniForma?: string;
  datumVzniku?: string;
  datumZaniku?: string;
  czNace?: string[];
  sidlo?: {
    psc?: number | string;
    nazevObce?: string;
    nazevUlice?: string;
    cisloDomovni?: number | string;
    cisloOrientacni?: number | string;
  };
  seznamRegistraci?: Record<string, string>;
};

type GhostRow = {
  ico: string;
  name: string;
  legal_form: string | null;
  cz_nace: string[];
  category_ids: string[];
  region_id: string | null;
  district_id: string | null;
  legal_address: Record<string, unknown> | null;
  datum_vzniku: string | null;
  datum_zaniku: string | null;
  registration_states: Record<string, string>;
};

type Stats = {
  fetched: number;
  filtered_inactive: number;
  filtered_nace: number;
  kept: number;
  upserted: number;
  over_limit_codes: string[];
};

// -------------------------------------------------------------------------
// HTTP helper
// -------------------------------------------------------------------------
async function aresPost(url: string, body: unknown, attempt = 0): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 3) throw new Error(`ARES ${res.status} po 3 retries`);
    const wait = 500 * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, wait));
    return aresPost(url, body, attempt + 1);
  }

  const text = await res.text();
  if (!res.ok) {
    // ARES vrací 400 s payloadem { kod: 'CHYBA_VSTUPU', popis: '...' } pro >1000 výsledků
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* */ }
    if (parsed?.kod === "CHYBA_VSTUPU") {
      const err = new Error(parsed.popis ?? "CHYBA_VSTUPU");
      (err as any).code = "CHYBA_VSTUPU";
      throw err;
    }
    throw new Error(`ARES HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text);
}

// -------------------------------------------------------------------------
// CzNace ciselnik
// -------------------------------------------------------------------------
type NaceCode = { kod: string; nazev: string };

async function fetchCzNace5DigitCodes(): Promise<NaceCode[]> {
  const data = await aresPost(ARES_CISELNIK, {
    kodCiselniku: "CzNace",
    pocet: 5000,
  });
  const items: any[] = data?.polozkyCiselniku ?? [];
  // Filtr: jen 5-cif. (subclasses) které matchují naše prefixy
  const out: NaceCode[] = [];
  for (const item of items) {
    const codes: string[] = item?.kody ?? [];
    for (const code of codes) {
      if (code.length === 5 && ACTIVE_PREFIXES.some((p) => code.startsWith(p))) {
        out.push({ kod: code, nazev: item?.nazev ?? "" });
        break;
      }
    }
  }
  return out;
}

// -------------------------------------------------------------------------
// Filtr + mapping (reused from old version)
// -------------------------------------------------------------------------
function isRelevantNace(nace: string[]): boolean {
  return nace.some((n) =>
    RELEVANT_NACE_PREFIXES.some((p) => n.startsWith(p))
  );
}

function isActive(subject: AresSubject): boolean {
  if (subject.datumZaniku) return false;
  const states = subject.seznamRegistraci ?? {};
  const active = (k: string) => states[k] === "AKTIVNI";
  return (
    active("stavZdrojeVr") ||
    active("stavZdrojeRzp") ||
    active("stavZdrojeRos") ||
    active("stavZdrojeCeu") ||
    active("stavZdrojeRs")
  );
}

function deriveCategoryIds(
  nace: string[],
  categorySlugMap: Map<string, string>
): string[] {
  const ids = new Set<string>();
  const sortedKeys = Object.keys(NACE_TO_CATEGORY_KEY).sort(
    (a, b) => b.length - a.length
  );
  for (const code of nace) {
    for (const prefix of sortedKeys) {
      if (code.startsWith(prefix)) {
        const slug = NACE_TO_CATEGORY_KEY[prefix];
        const id = categorySlugMap.get(slug);
        if (id) ids.add(id);
        break;
      }
    }
  }
  return Array.from(ids);
}

function mapToGhostRow(
  subject: AresSubject,
  categorySlugMap: Map<string, string>,
  pscToDistrict: Map<string, { district_id: string; region_id: string }>
): GhostRow | null {
  const naces = (subject.czNace ?? []).map(String);
  if (!isRelevantNace(naces)) return null;
  if (!isActive(subject)) return null;

  // PSČ → okres lookup. Jdeme od plného PSČ přes 4-ciferný prefix po 3-ciferný.
  let district_id: string | null = null;
  let region_id: string | null = null;
  const pscRaw = subject.sidlo?.psc;
  const psc = pscRaw != null ? String(pscRaw).replace(/\s+/g, "") : "";
  if (psc) {
    const candidates = [psc, psc.slice(0, 4), psc.slice(0, 3)];
    for (const key of candidates) {
      const hit = pscToDistrict.get(key);
      if (hit) {
        district_id = hit.district_id;
        region_id = hit.region_id;
        break;
      }
    }
  }

  return {
    ico: subject.ico,
    name: subject.obchodniJmeno,
    legal_form: subject.pravniForma ?? null,
    cz_nace: naces,
    category_ids: deriveCategoryIds(naces, categorySlugMap),
    region_id,
    district_id,
    legal_address: subject.sidlo
      ? {
          street: subject.sidlo.nazevUlice ?? null,
          house_number: subject.sidlo.cisloDomovni != null
            ? String(subject.sidlo.cisloDomovni) : null,
          orientation_number: subject.sidlo.cisloOrientacni != null
            ? String(subject.sidlo.cisloOrientacni) : null,
          city: subject.sidlo.nazevObce ?? null,
          postal_code: psc || null,
          country: "Česká republika",
          source: "ares_api",
        }
      : null,
    datum_vzniku: subject.datumVzniku ?? null,
    datum_zaniku: subject.datumZaniku ?? null,
    registration_states: subject.seznamRegistraci ?? {},
  };
}

// -------------------------------------------------------------------------
// Lookup tables
// -------------------------------------------------------------------------
async function loadCategorySlugMap(supabase: any) {
  const { data } = await supabase
    .from("categories")
    .select("id, slug")
    .is("parent_id", null);
  const map = new Map<string, string>();
  for (const c of data ?? []) {
    if (c.slug) map.set(c.slug as string, c.id as string);
  }
  return map;
}

async function loadPscToDistrictMap(supabase: any) {
  const { data } = await supabase
    .from("districts")
    .select("id, region_id, psc_prefixes");
  const map = new Map<string, { district_id: string; region_id: string }>();
  for (const d of (data ?? []) as Array<{
    id: string;
    region_id: string;
    psc_prefixes: string[] | null;
  }>) {
    for (const p of d.psc_prefixes ?? []) {
      map.set(p, { district_id: d.id, region_id: d.region_id });
    }
  }
  return map;
}

// -------------------------------------------------------------------------
// Pagination per NACE code
// -------------------------------------------------------------------------
async function* iterateNace(
  naceCode: string,
  stats: Stats
): AsyncGenerator<AresSubject> {
  let start = 0;
  let total = -1;

  while (true) {
    let data: any;
    try {
      data = await aresPost(ARES_VYHLEDAT, {
        czNace: [naceCode],
        start,
        pocet: PAGE_SIZE,
      });
    } catch (e: any) {
      if (e.code === "CHYBA_VSTUPU") {
        console.warn(`  [${naceCode}] nad limit 1 000: ${e.message}`);
        stats.over_limit_codes.push(naceCode);
        return;
      }
      throw e;
    }

    const items: AresSubject[] = data?.ekonomickeSubjekty ?? [];
    total = data?.pocetCelkem ?? 0;

    if (start === 0) {
      console.log(`  [${naceCode}] celkem ${total} subjektů`);
      if (total > ARES_LIMIT_PER_QUERY) {
        console.warn(
          `  [${naceCode}] varování: ${total} > ${ARES_LIMIT_PER_QUERY}, ` +
          `dostaneme jen prvních ${ARES_LIMIT_PER_QUERY}`
        );
        stats.over_limit_codes.push(naceCode);
      }
    }

    for (const item of items) {
      stats.fetched++;
      yield item;
    }

    start += items.length;
    if (items.length === 0 || start >= total || start >= ARES_LIMIT_PER_QUERY) break;

    // Throttle proti rate-limitu
    if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }
}

// -------------------------------------------------------------------------
// Upsert
// -------------------------------------------------------------------------
async function upsertBatch(supabase: any, rows: GhostRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  if (DRY_RUN) {
    console.log(`  [dry-run] would upsert ${rows.length} rows`);
    return rows.length;
  }
  const { error, count } = await supabase
    .from("ghost_subjects")
    .upsert(rows, { onConflict: "ico", count: "exact", ignoreDuplicates: false });
  if (error) throw new Error(`Upsert selhal: ${error.message}`);
  return count ?? rows.length;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Chybí env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("[1/4] Načítám CzNace číselník (5-cif. kódy)...");
  const naceCodes = await fetchCzNace5DigitCodes();
  console.log(
    `  ${naceCodes.length} kódů k naimportování (prefixy: ${ACTIVE_PREFIXES.join(", ")})`
  );
  if (naceCodes.length === 0) {
    console.warn("  Žádné NACE kódy nenalezeny — kontrola prefixů?");
    return;
  }

  console.log("[2/4] Načítám lookup tables (categories + districts.psc_prefixes)...");
  const categoryMap = await loadCategorySlugMap(supabase);
  const pscMap = await loadPscToDistrictMap(supabase);
  console.log(
    `  kategorií: ${categoryMap.size}, PSČ→okres entries: ${pscMap.size}`
  );
  if (pscMap.size === 0) {
    console.warn(
      "  PSČ mapa je prázdná — všechny ghost_subjects budou bez district_id. " +
      "Doplň districts.psc_prefixes před spuštěním."
    );
  }

  console.log("[3/4] Stahuji a upsertuji ghost_subjects...");
  const stats: Stats = {
    fetched: 0,
    filtered_inactive: 0,
    filtered_nace: 0,
    kept: 0,
    upserted: 0,
    over_limit_codes: [],
  };
  const buffer: GhostRow[] = [];

  for (const { kod, nazev } of naceCodes) {
    console.log(`\n  → NACE ${kod} (${nazev})`);
    for await (const subject of iterateNace(kod, stats)) {
      // isActive check
      if (!isActive(subject)) {
        stats.filtered_inactive++;
        continue;
      }
      // isRelevantNace (subjekt může mít více NACE; nejmíň jeden musí matchnout)
      const naces = (subject.czNace ?? []).map(String);
      if (!isRelevantNace(naces)) {
        stats.filtered_nace++;
        continue;
      }

      const row = mapToGhostRow(subject, categoryMap, pscMap);
      if (!row) continue;
      stats.kept++;
      buffer.push(row);

      if (buffer.length >= BATCH_SIZE) {
        const n = await upsertBatch(supabase, buffer.splice(0));
        stats.upserted += n;
      }
    }

    if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  if (buffer.length > 0) {
    const n = await upsertBatch(supabase, buffer);
    stats.upserted += n;
  }

  console.log("\n[4/4] Hotovo:");
  console.log(`  fetched:        ${stats.fetched.toLocaleString()}`);
  console.log(`  filtered NACE:  ${stats.filtered_nace.toLocaleString()}`);
  console.log(`  filtered inactive: ${stats.filtered_inactive.toLocaleString()}`);
  console.log(`  kept:           ${stats.kept.toLocaleString()}`);
  console.log(`  upserted:       ${stats.upserted.toLocaleString()}`);
  if (stats.over_limit_codes.length > 0) {
    console.warn(
      `  POZOR: ${stats.over_limit_codes.length} NACE kódů přeplnilo limit 1 000 ` +
      `(některé subjekty se nestáhly): ${stats.over_limit_codes.join(", ")}`
    );
    console.warn(
      `  Tyto kódy je třeba sub-splitnout (např. po krajích) — doplň manuální logiku.`
    );
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
