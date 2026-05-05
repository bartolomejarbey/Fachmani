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
 *   ARES_PAGE_SIZE=100    — velikost stránky (max 100 doporučeno)
 *   ARES_THROTTLE_MS=200  — pauza mezi requesty
 *
 * Strategie (proč ne bulk dump):
 *   ARES nemá veřejný bulk dump. POST /ekonomicke-subjekty/vyhledat má hard
 *   limit 1 000 výsledků/query. Iterujeme per 5-cif. NACE z CzNace ciselniku.
 *   Pokud nějaký NACE překročí limit, sub-split:
 *     1) NACE × pravniForma  (z hardkódovaného seznamu populárních forem)
 *     2) NACE × pravniForma × financniUrad  (139 územních pracovišť)
 *
 * Mapping na lokální data:
 *   - region_id přes nazevKraje match s public.regions.name_cs
 *   - district_id přes nazevOkresu match s public.districts.name_cs
 *     (pro Prahu kraj 19 → district „Hlavní město Praha")
 *   - category_ids přes NACE prefix → categories.slug map
 *
 * Bezpečnost:
 *   - Skript musí běžet se SUPABASE_SERVICE_ROLE_KEY (RLS by jinak blokoval).
 *   - První spuštění: ARES_DRY_RUN=1 + ARES_NACE_PREFIXES=4321 pro ověření.
 */

// @ts-nocheck — Supabase typed client se v scripts/ nesnáší se strict mode
import "./_load-env";
import { createClient } from "@supabase/supabase-js";
import { naceToCategoryIds, type CategoryRef } from "../lib/ares/nace-categories";

// -------------------------------------------------------------------------
// Konfigurace
// -------------------------------------------------------------------------
const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest";
const ARES_VYHLEDAT = `${ARES_BASE}/ekonomicke-subjekty/vyhledat`;
const ARES_CISELNIK = `${ARES_BASE}/ciselniky-nazevniky/vyhledat`;

// NACE prefixy pro filtraci ARES dotazů (chceme jen řemeslné/službové subjekty,
// ne 100 % ARESu). Subjekty s NACE mimo tento seznam se ignorují.
const RELEVANT_NACE_PREFIXES = [
  "41", "42", "43", "45",
  "14", "16", "23", "25", "31", "33", "38",
  "49", "56",
  "62", "631", "69", "70", "71", "73", "74", "75", "79",
  "81", "82", "85", "881",
  "9001", "9002", "9003", "93",
  "9521", "9522", "9523", "9524", "9525", "9529",
  "9601", "9602", "9603", "9604", "9609",
];

// Populární právní formy. Pokud subjekt má pf mimo tento seznam, nezachytíme
// ho při sub-splitu — řemeslné NACE ale typicky jsou koncentrovaná v 101/112.
const POPULAR_PRAVNI_FORMY = [
  "101", "102", "103", "105", "107",  // FO podnikající
  "111", "112", "113", "117", "118",  // PO obchodní
  "121", "141", "144", "145",         // a.s., SE
  "161", "205",                       // organizační složky
  "301", "311", "421", "501",         // ostatní právní formy
  "601", "701", "706", "731",         // sdružení / SVJ
  "751", "761", "771", "999",
];

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
  czNace2008?: string[];
  sidlo?: {
    psc?: number | string;
    kodKraje?: number;
    nazevKraje?: string;
    kodOkresu?: number;
    nazevOkresu?: string;
    kodObce?: number;
    nazevObce?: string;
    kodSpravnihoObvodu?: number;
    nazevSpravnihoObvodu?: string;
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
  duplicates: number;
  kept: number;
  upserted: number;
  over_limit_buckets: string[];
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
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* */ }

  if (!res.ok || parsed?.kod === "CHYBA_VSTUPU") {
    if (parsed?.kod === "CHYBA_VSTUPU") {
      const err = new Error(parsed.popis ?? "CHYBA_VSTUPU");
      (err as any).code = "CHYBA_VSTUPU";
      (err as any).subKod = parsed.subKod;
      throw err;
    }
    throw new Error(`ARES HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return parsed;
}

// -------------------------------------------------------------------------
// CzNace ciselnik (5-cif. kódy odpovídající našim prefixům)
// -------------------------------------------------------------------------
type NaceCode = { kod: string; nazev: string };

async function fetchCzNace5DigitCodes(): Promise<NaceCode[]> {
  const data = await aresPost(ARES_CISELNIK, { kodCiselniku: "CzNace" });
  const items: any[] = data?.ciselniky?.[0]?.polozkyCiselniku ?? [];
  const out: NaceCode[] = [];
  for (const item of items) {
    const code: string = item?.kod ?? "";
    if (code.length !== 5) continue;
    if (!ACTIVE_PREFIXES.some((p) => code.startsWith(p))) continue;
    const nazevs = item?.nazev ?? [];
    const cs = nazevs.find?.((n: any) => n?.kodJazyka === "cs")?.nazev ?? "";
    out.push({ kod: code, nazev: cs });
  }
  return out;
}

// -------------------------------------------------------------------------
// FinancniUrad ciselnik (139 územních pracovišť)
// -------------------------------------------------------------------------
async function fetchFinancniUrady(): Promise<string[]> {
  const data = await aresPost(ARES_CISELNIK, { kodCiselniku: "FinancniUrad" });
  const items: any[] = data?.ciselniky?.[0]?.polozkyCiselniku ?? [];
  return items
    .map((it: any) => String(it?.kod ?? ""))
    .filter((kod) => /^\d{3}$/.test(kod) && kod !== "000");
}

// -------------------------------------------------------------------------
// Filtr + mapping
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

// deriveCategoryIds nahrazena `naceToCategoryIds` z lib/ares/nace-categories.

function normalizeNazev(s: string | undefined | null): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractNaces(subject: AresSubject): string[] {
  const list = subject.czNace2008 ?? subject.czNace ?? [];
  return list.map(String);
}

function mapToGhostRow(
  subject: AresSubject,
  categorySlugMap: Map<string, CategoryRef>,
  regionByNazev: Map<string, string>,
  districtByNazev: Map<string, { id: string; region_id: string }>,
  prahaDistrictId: string | null
): GhostRow | null {
  const naces = extractNaces(subject);
  if (!isRelevantNace(naces)) return null;
  if (!isActive(subject)) return null;

  // Region/district mapping přes nazev match
  let region_id: string | null = null;
  let district_id: string | null = null;
  const sidlo = subject.sidlo ?? {};

  const krajKey = normalizeNazev(sidlo.nazevKraje);
  if (krajKey) region_id = regionByNazev.get(krajKey) ?? null;

  // Pro Prahu (kodKraje 19 / "Hlavní město Praha") nemá ARES kodOkresu — používáme
  // celou Prahu jako district (LAU CZ0100). Pro mimo-pražské mapujeme nazevOkresu.
  if (sidlo.kodKraje === 19 || krajKey === "hlavní město praha") {
    district_id = prahaDistrictId;
  } else {
    const okresKey = normalizeNazev(sidlo.nazevOkresu);
    const hit = districtByNazev.get(okresKey);
    if (hit) {
      district_id = hit.id;
      // Pokud kraj match selhal, použij kraj z okresu jako fallback
      if (!region_id) region_id = hit.region_id;
    }
  }

  const pscRaw = sidlo.psc;
  const psc = pscRaw != null ? String(pscRaw).replace(/\s+/g, "") : "";

  return {
    ico: subject.ico,
    name: subject.obchodniJmeno,
    legal_form: subject.pravniForma ?? null,
    cz_nace: naces,
    category_ids: naceToCategoryIds(naces, categorySlugMap),
    region_id,
    district_id,
    legal_address: sidlo
      ? {
          street: sidlo.nazevUlice ?? null,
          house_number: sidlo.cisloDomovni != null ? String(sidlo.cisloDomovni) : null,
          orientation_number: sidlo.cisloOrientacni != null
            ? String(sidlo.cisloOrientacni) : null,
          city: sidlo.nazevObce ?? null,
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
    .select("id, slug, parent_id");
  const map = new Map<string, CategoryRef>();
  for (const c of data ?? []) {
    if (c.slug) {
      map.set(c.slug as string, {
        id: c.id as string,
        parent_id: (c.parent_id as string | null) ?? null,
      });
    }
  }
  return map;
}

async function loadRegionMap(supabase: any) {
  const { data } = await supabase.from("regions").select("id, name_cs");
  const map = new Map<string, string>();
  for (const r of (data ?? []) as Array<{ id: string; name_cs: string }>) {
    map.set(normalizeNazev(r.name_cs), r.id);
  }
  return map;
}

async function loadDistrictMap(supabase: any) {
  const { data } = await supabase
    .from("districts")
    .select("id, region_id, name_cs");
  const map = new Map<string, { id: string; region_id: string }>();
  let prahaId: string | null = null;
  for (const d of (data ?? []) as Array<{
    id: string;
    region_id: string;
    name_cs: string;
  }>) {
    map.set(normalizeNazev(d.name_cs), { id: d.id, region_id: d.region_id });
    if (normalizeNazev(d.name_cs) === "hlavní město praha") prahaId = d.id;
  }
  return { map, prahaId };
}

// -------------------------------------------------------------------------
// Pagination per filtr (NACE / NACE+pf / NACE+pf+fu)
// -------------------------------------------------------------------------
async function* paginateFilter(
  baseFilter: Record<string, unknown>,
  bucketLabel: string,
  stats: Stats,
  seenIcos: Set<string>
): AsyncGenerator<AresSubject> {
  let start = 0;
  let total = -1;

  while (true) {
    let data: any;
    try {
      data = await aresPost(ARES_VYHLEDAT, {
        ...baseFilter,
        start,
        pocet: PAGE_SIZE,
      });
    } catch (e: any) {
      if (e.code === "CHYBA_VSTUPU") {
        // Při paginaci by k tomuto nemělo dojít — peek by to chytnul dřív.
        stats.over_limit_buckets.push(bucketLabel);
        return;
      }
      throw e;
    }

    const items: AresSubject[] = data?.ekonomickeSubjekty ?? [];
    total = data?.pocetCelkem ?? 0;

    for (const item of items) {
      if (!item?.ico) continue;
      if (seenIcos.has(item.ico)) {
        stats.duplicates++;
        continue;
      }
      seenIcos.add(item.ico);
      stats.fetched++;
      yield item;
    }

    start += items.length;
    if (items.length === 0 || start >= total || start >= ARES_LIMIT_PER_QUERY) break;

    if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }
}

async function peekTotal(filter: Record<string, unknown>): Promise<number> {
  try {
    const data = await aresPost(ARES_VYHLEDAT, { ...filter, start: 0, pocet: 1 });
    return data?.pocetCelkem ?? 0;
  } catch (e: any) {
    if (e.code === "CHYBA_VSTUPU") return Infinity;
    throw e;
  }
}

async function* iterateNace(
  naceCode: string,
  fus: string[],
  stats: Stats,
  seenIcos: Set<string>
): AsyncGenerator<AresSubject> {
  // Úroveň 1: NACE-only
  const t1 = await peekTotal({ czNace: [naceCode] });
  if (t1 === 0) {
    console.log(`  [${naceCode}] 0 subjektů`);
    return;
  }
  if (t1 <= ARES_LIMIT_PER_QUERY) {
    console.log(`  [${naceCode}] ${t1} subjektů (1 dotaz)`);
    yield* paginateFilter({ czNace: [naceCode] }, naceCode, stats, seenIcos);
    return;
  }

  console.log(`  [${naceCode}] >${ARES_LIMIT_PER_QUERY} subjektů — sub-split per pravniForma`);

  // Úroveň 2: NACE × pravniForma
  for (const pf of POPULAR_PRAVNI_FORMY) {
    const t2 = await peekTotal({ czNace: [naceCode], pravniForma: [pf] });
    if (t2 === 0) continue;

    if (t2 <= ARES_LIMIT_PER_QUERY) {
      console.log(`    [${naceCode}+pf=${pf}] ${t2} subjektů`);
      yield* paginateFilter(
        { czNace: [naceCode], pravniForma: [pf] },
        `${naceCode}+pf=${pf}`,
        stats,
        seenIcos
      );
      if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
      continue;
    }

    // Úroveň 3: NACE × pf × financniUrad
    console.log(`    [${naceCode}+pf=${pf}] >${ARES_LIMIT_PER_QUERY} — sub-split per FU`);
    let pfTotal = 0;
    for (const fu of fus) {
      const t3 = await peekTotal({
        czNace: [naceCode],
        pravniForma: [pf],
        financniUrad: [fu],
      });
      if (t3 === 0) continue;
      if (t3 > ARES_LIMIT_PER_QUERY) {
        console.warn(
          `      [${naceCode}+pf=${pf}+fu=${fu}] >${ARES_LIMIT_PER_QUERY} ` +
          `— prvních ${ARES_LIMIT_PER_QUERY} se stáhne, zbytek skip`
        );
        stats.over_limit_buckets.push(`${naceCode}+pf=${pf}+fu=${fu}`);
      }
      pfTotal += t3;
      yield* paginateFilter(
        { czNace: [naceCode], pravniForma: [pf], financniUrad: [fu] },
        `${naceCode}+pf=${pf}+fu=${fu}`,
        stats,
        seenIcos
      );
      if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
    console.log(`    [${naceCode}+pf=${pf}] celkem ~${pfTotal} subjektů přes FU split`);
  }
}

// -------------------------------------------------------------------------
// Upsert
// -------------------------------------------------------------------------
async function upsertBatch(supabase: any, rows: GhostRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  if (DRY_RUN) {
    console.log(`    [dry-run] would upsert ${rows.length} rows`);
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

  console.log("[1/4] Načítám CzNace + FinancniUrad číselníky...");
  const [naceCodes, fus] = await Promise.all([
    fetchCzNace5DigitCodes(),
    fetchFinancniUrady(),
  ]);
  console.log(
    `  ${naceCodes.length} NACE kódů, ${fus.length} finančních úřadů ` +
    `(prefixy: ${ACTIVE_PREFIXES.join(", ")})`
  );
  if (naceCodes.length === 0) {
    console.warn("  Žádné NACE kódy nenalezeny — kontrola prefixů?");
    return;
  }

  console.log("[2/4] Načítám lookup tables (categories, regions, districts)...");
  const [categoryMap, regionMap, districtData] = await Promise.all([
    loadCategorySlugMap(supabase),
    loadRegionMap(supabase),
    loadDistrictMap(supabase),
  ]);
  console.log(
    `  kategorií: ${categoryMap.size}, krajů: ${regionMap.size}, ` +
    `okresů: ${districtData.map.size}` +
    (districtData.prahaId ? "" : " — POZOR: Praha district neexistuje, pražské subjekty budou bez district_id")
  );

  console.log("[3/4] Stahuji a upsertuji ghost_subjects...");
  const stats: Stats = {
    fetched: 0,
    filtered_inactive: 0,
    filtered_nace: 0,
    duplicates: 0,
    kept: 0,
    upserted: 0,
    over_limit_buckets: [],
  };
  const buffer: GhostRow[] = [];
  const seenIcos = new Set<string>();

  for (const { kod, nazev } of naceCodes) {
    console.log(`\n  → NACE ${kod} (${nazev})`);
    for await (const subject of iterateNace(kod, fus, stats, seenIcos)) {
      // isActive a NACE filter (subjekt může mít víc NACE; alespoň jeden musí být relevantní)
      if (!isActive(subject)) {
        stats.filtered_inactive++;
        continue;
      }
      const naces = extractNaces(subject);
      if (!isRelevantNace(naces)) {
        stats.filtered_nace++;
        continue;
      }

      const row = mapToGhostRow(
        subject,
        categoryMap,
        regionMap,
        districtData.map,
        districtData.prahaId
      );
      if (!row) continue;
      stats.kept++;
      buffer.push(row);

      if (buffer.length >= BATCH_SIZE) {
        const n = await upsertBatch(supabase, buffer.splice(0));
        stats.upserted += n;
        process.stdout.write(
          `    fetched=${stats.fetched.toLocaleString()} kept=${stats.kept.toLocaleString()} upserted=${stats.upserted.toLocaleString()}\r`
        );
      }
    }
  }

  if (buffer.length > 0) {
    const n = await upsertBatch(supabase, buffer);
    stats.upserted += n;
  }

  console.log("\n[4/4] Hotovo:");
  console.log(`  fetched:        ${stats.fetched.toLocaleString()}`);
  console.log(`  duplicates:     ${stats.duplicates.toLocaleString()}`);
  console.log(`  filtered NACE:  ${stats.filtered_nace.toLocaleString()}`);
  console.log(`  filtered inactive: ${stats.filtered_inactive.toLocaleString()}`);
  console.log(`  kept:           ${stats.kept.toLocaleString()}`);
  console.log(`  upserted:       ${stats.upserted.toLocaleString()}`);
  if (stats.over_limit_buckets.length > 0) {
    console.warn(
      `  POZOR: ${stats.over_limit_buckets.length} bucketů přeplnilo limit 1 000 ` +
      `(některé subjekty se nestáhly):`
    );
    for (const b of stats.over_limit_buckets.slice(0, 10)) console.warn(`    - ${b}`);
    if (stats.over_limit_buckets.length > 10) {
      console.warn(`    ... a ${stats.over_limit_buckets.length - 10} dalších`);
    }
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
