/**
 * import-ares-ghost.ts
 * =====================
 * Bootstrap script: stáhne bulk XML dump z ARES Open Data, vyfiltruje řemeslné NACE
 * obory a aktivní subjekty, namapuje na Fachmani schéma (kategorie + okres) a
 * upsertne do public.ghost_subjects.
 *
 * Spuštění:
 *   $ ARES_BULK_URL="https://ares.gov.cz/.../ares-data-<datum>.zip" \
 *     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/import-ares-ghost.ts
 *
 * Volitelně:
 *   ARES_BULK_DRY_RUN=1   - jen logy, nic se nepíše do DB
 *   ARES_BULK_LIMIT=10000 - omezí počet zpracovaných záznamů (test)
 *
 * URL bulk dumpu je třeba zjistit ručně z https://ares.gov.cz/cs/api/ares-data
 * (otevřená data se publikují měsíčně).
 *
 * Logika:
 *   1. Stáhne ZIP do /tmp.
 *   2. Streamem (yauzl) iteruje XML entries v ZIPu.
 *   3. SAX-em parseruje každý XML — emituje strukturovaný RawSubject pro každý
 *      <ekonomickySubjekt> element. Žádné loadování celého XML do paměti.
 *   4. Pro každý subjekt:
 *      - kontrola NACE (alespoň jedno czNACE musí být v RELEVANT_NACE_PREFIXES)
 *      - kontrola aktivity (datumZaniku is null + aspoň jeden stavZdroje*=AKTIVNI)
 *      - mapping NACE → category_ids (přes lookup z public.categories.slug)
 *      - mapping PSČ → district_id (přes psc_prefixes column v public.districts)
 *   5. Batch upsert (1000 záznamů per batch) do ghost_subjects.
 *
 * Bezpečnostní poznámky:
 *   - Skript musí běžet se SUPABASE_SERVICE_ROLE_KEY (RLS by jinak blokoval insert).
 *   - První spuštění: ARES_BULK_DRY_RUN=1 + ARES_BULK_LIMIT=1000 pro ověření.
 *   - Očekávaný objem: 100 000 – 200 000 záznamů po NACE filtru (~30–60 min).
 */

// @ts-nocheck — Supabase typed client se v scripts/ nesnáší se strict mode
import { createClient } from "@supabase/supabase-js";
import sax from "sax";
import yauzl from "yauzl";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";

// -------------------------------------------------------------------------
// Konfigurace
// -------------------------------------------------------------------------
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
const TMP_DIR = "/tmp/fachmani-ares";
const DRY_RUN = process.env.ARES_BULK_DRY_RUN === "1";
const LIMIT = process.env.ARES_BULK_LIMIT
  ? Number(process.env.ARES_BULK_LIMIT)
  : Infinity;

// -------------------------------------------------------------------------
// Typy
// -------------------------------------------------------------------------
type RawSubject = {
  ico: string;
  obchodniJmeno: string;
  pravniForma?: string;
  datumVzniku?: string;
  datumZaniku?: string;
  czNace: string[];
  sidlo?: {
    psc?: string;
    nazevObce?: string;
    nazevUlice?: string;
    cisloDomovni?: string;
    cisloOrientacni?: string;
  };
  seznamRegistraci: Record<string, string>;
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
  parsed: number;
  filtered_inactive: number;
  filtered_nace: number;
  kept: number;
  upserted: number;
};

// -------------------------------------------------------------------------
// Filtr + mapping
// -------------------------------------------------------------------------
function isRelevantNace(nace: string[]): boolean {
  return nace.some((n) =>
    RELEVANT_NACE_PREFIXES.some((p) => n.startsWith(p))
  );
}

function isActive(subject: RawSubject): boolean {
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
  for (const code of nace) {
    // longest-prefix-match: zkusíme od nejdelšího po nejkratší
    const sortedKeys = Object.keys(NACE_TO_CATEGORY_KEY).sort(
      (a, b) => b.length - a.length
    );
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
  subject: RawSubject,
  categorySlugMap: Map<string, string>,
  pscToDistrict: Map<string, { district_id: string; region_id: string }>
): GhostRow | null {
  if (!isRelevantNace(subject.czNace)) return null;
  if (!isActive(subject)) return null;

  // PSČ → okres lookup. Jdeme od plného PSČ přes 4-ciferný prefix po 3-ciferný.
  let district_id: string | null = null;
  let region_id: string | null = null;
  const psc = subject.sidlo?.psc?.replace(/\s+/g, "") ?? "";
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
    cz_nace: subject.czNace,
    category_ids: deriveCategoryIds(subject.czNace, categorySlugMap),
    region_id,
    district_id,
    legal_address: subject.sidlo
      ? {
          street: subject.sidlo.nazevUlice ?? null,
          house_number: subject.sidlo.cisloDomovni ?? null,
          orientation_number: subject.sidlo.cisloOrientacni ?? null,
          city: subject.sidlo.nazevObce ?? null,
          postal_code: psc || null,
          country: "Česká republika",
          source: "ares_bulk",
        }
      : null,
    datum_vzniku: subject.datumVzniku ?? null,
    datum_zaniku: subject.datumZaniku ?? null,
    registration_states: subject.seznamRegistraci,
  };
}

// -------------------------------------------------------------------------
// SAX streaming parser
// -------------------------------------------------------------------------
/**
 * Parsuje XML stream a yieldne každý <ekonomickySubjekt> jako RawSubject.
 * Předpokládá strukturu (zjednodušeně):
 *   <ekonomickySubjekt>
 *     <ico>27082440</ico>
 *     <obchodniJmeno>Acme s.r.o.</obchodniJmeno>
 *     <pravniForma>112</pravniForma>
 *     <datumVzniku>2010-03-01</datumVzniku>
 *     <datumZaniku>2024-05-01</datumZaniku>  <!-- volitelné -->
 *     <sidlo>
 *       <psc>11000</psc>
 *       <nazevObce>Praha</nazevObce>
 *       ...
 *     </sidlo>
 *     <czNace>
 *       <kod>4334</kod>
 *       <kod>4321</kod>
 *     </czNace>
 *     <seznamRegistraci>
 *       <stavZdrojeVr>AKTIVNI</stavZdrojeVr>
 *       <stavZdrojeRzp>AKTIVNI</stavZdrojeRzp>
 *     </seznamRegistraci>
 *   </ekonomickySubjekt>
 *
 * POZNÁMKA: Pokud má reálný ARES bulk XML jiné názvy nebo nesting (např. dvě
 * úrovně <Vypis>), tato funkce potřebuje úpravu. Spusť s ARES_BULK_LIMIT=10
 * a podívej se na první výstup před plným importem.
 */
function parseAresXmlStream(
  stream: NodeJS.ReadableStream
): AsyncIterable<RawSubject> {
  return {
    [Symbol.asyncIterator]() {
      const parser = sax.createStream(true, { trim: true, lowercase: false });
      const queue: RawSubject[] = [];
      let resolveNext: ((v: IteratorResult<RawSubject>) => void) | null = null;
      let ended = false;
      let errored: Error | null = null;

      const stack: string[] = [];
      let current: Partial<RawSubject> | null = null;
      let inSidlo = false;
      let inCzNace = false;
      let inSeznamRegistraci = false;
      let textBuffer = "";

      const flush = () => {
        if (resolveNext && queue.length > 0) {
          const r = resolveNext;
          resolveNext = null;
          r({ value: queue.shift()!, done: false });
        } else if (resolveNext && ended) {
          const r = resolveNext;
          resolveNext = null;
          r({ value: undefined as unknown as RawSubject, done: true });
        }
      };

      parser.on("opentag", (node) => {
        const name = node.name;
        stack.push(name);
        textBuffer = "";

        if (name === "ekonomickySubjekt" || name === "EkonomickySubjekt") {
          current = { czNace: [], seznamRegistraci: {} };
          inSidlo = false;
          inCzNace = false;
          inSeznamRegistraci = false;
        } else if (current) {
          if (name === "sidlo" || name === "Sidlo") inSidlo = true;
          else if (name === "czNace" || name === "CzNace") inCzNace = true;
          else if (name === "seznamRegistraci" || name === "SeznamRegistraci")
            inSeznamRegistraci = true;
        }
      });

      parser.on("text", (text) => {
        textBuffer += text;
      });

      parser.on("cdata", (text) => {
        textBuffer += text;
      });

      parser.on("closetag", (name) => {
        const txt = textBuffer.trim();
        textBuffer = "";

        if (current) {
          // Top-level fields
          if (stack.length >= 2) {
            const parent = stack[stack.length - 2];
            const isTopLevel =
              parent === "ekonomickySubjekt" || parent === "EkonomickySubjekt";

            if (isTopLevel && txt) {
              switch (name) {
                case "ico":
                case "Ico":
                  current.ico = txt;
                  break;
                case "obchodniJmeno":
                case "ObchodniJmeno":
                  current.obchodniJmeno = txt;
                  break;
                case "pravniForma":
                case "PravniForma":
                  current.pravniForma = txt;
                  break;
                case "datumVzniku":
                case "DatumVzniku":
                  current.datumVzniku = txt;
                  break;
                case "datumZaniku":
                case "DatumZaniku":
                  current.datumZaniku = txt;
                  break;
              }
            }

            // Sidlo nested
            if (inSidlo && txt && parent === "sidlo") {
              if (!current.sidlo) current.sidlo = {};
              if (name === "psc" || name === "Psc") current.sidlo.psc = txt;
              else if (name === "nazevObce" || name === "NazevObce")
                current.sidlo.nazevObce = txt;
              else if (name === "nazevUlice" || name === "NazevUlice")
                current.sidlo.nazevUlice = txt;
              else if (name === "cisloDomovni" || name === "CisloDomovni")
                current.sidlo.cisloDomovni = txt;
              else if (
                name === "cisloOrientacni" ||
                name === "CisloOrientacni"
              )
                current.sidlo.cisloOrientacni = txt;
            }

            // czNace/kod
            if (
              inCzNace &&
              txt &&
              (name === "kod" || name === "Kod") &&
              current.czNace
            ) {
              current.czNace.push(txt);
            }

            // seznamRegistraci/stavZdrojeXxx
            if (
              inSeznamRegistraci &&
              txt &&
              name.startsWith("stavZdroje") &&
              current.seznamRegistraci
            ) {
              current.seznamRegistraci[name] = txt;
            }
          }
        }

        if (name === "sidlo" || name === "Sidlo") inSidlo = false;
        else if (name === "czNace" || name === "CzNace") inCzNace = false;
        else if (name === "seznamRegistraci" || name === "SeznamRegistraci")
          inSeznamRegistraci = false;
        else if (
          (name === "ekonomickySubjekt" || name === "EkonomickySubjekt") &&
          current
        ) {
          if (current.ico && current.obchodniJmeno) {
            queue.push(current as RawSubject);
            flush();
          }
          current = null;
        }

        stack.pop();
      });

      parser.on("error", (e) => {
        errored = e;
        if (resolveNext) {
          const r = resolveNext;
          resolveNext = null;
          r(Promise.reject(e) as unknown as IteratorResult<RawSubject>);
        }
      });

      parser.on("end", () => {
        ended = true;
        flush();
      });

      stream.pipe(parser);

      return {
        next(): Promise<IteratorResult<RawSubject>> {
          if (errored) return Promise.reject(errored);
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (ended) return Promise.resolve({ value: undefined as unknown as RawSubject, done: true });
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
      };
    },
  };
}

// -------------------------------------------------------------------------
// Yauzl streaming unzip — yieldne každý XML entry jako readable stream
// -------------------------------------------------------------------------
function openZipEntries(zipPath: string): Promise<{
  iterate: (
    handler: (entryName: string, stream: NodeJS.ReadableStream) => Promise<void>
  ) => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);
      resolve({
        iterate: (handler) =>
          new Promise((res, rej) => {
            zipfile.on("error", rej);
            zipfile.on("end", () => res());
            zipfile.on("entry", async (entry) => {
              if (/\/$/.test(entry.fileName)) {
                zipfile.readEntry();
                return;
              }
              if (!/\.xml$/i.test(entry.fileName)) {
                zipfile.readEntry();
                return;
              }
              zipfile.openReadStream(entry, async (e, stream) => {
                if (e || !stream) {
                  rej(e ?? new Error("no stream"));
                  return;
                }
                try {
                  await handler(entry.fileName, stream);
                  zipfile.readEntry();
                } catch (err) {
                  rej(err as Error);
                }
              });
            });
            zipfile.readEntry();
          }),
      });
    });
  });
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
  // Vyžaduje migraci 20260429000001_districts_psc_prefixes.sql, která přidá
  // sloupec psc_prefixes text[] a naseedí first-3 PSČ prefixy per okres.
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
// Download
// -------------------------------------------------------------------------
async function downloadBulkZip(url: string): Promise<string> {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const dest = path.join(TMP_DIR, "ares-bulk.zip");
  console.log(`[download] ${url} → ${dest}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download selhal: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  console.log(`[download] hotovo: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return dest;
}

// -------------------------------------------------------------------------
// Upsert
// -------------------------------------------------------------------------
async function upsertBatch(supabase: any, rows: GhostRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  if (DRY_RUN) {
    console.log(`[dry-run] would upsert ${rows.length} rows`);
    return rows.length;
  }
  const { error, count } = await supabase
    .from("ghost_subjects")
    .upsert(rows, { onConflict: "ico", count: "exact" });
  if (error) throw new Error(`Upsert selhal: ${error.message}`);
  return count ?? rows.length;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
async function main() {
  const url = process.env.ARES_BULK_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !supabaseUrl || !serviceKey) {
    throw new Error(
      "Chybí env vars: ARES_BULK_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("[1/4] Stahuji ARES bulk dump...");
  const zipPath = await downloadBulkZip(url);

  console.log("[2/4] Načítám lookup tables...");
  const categoryMap = await loadCategorySlugMap(supabase);
  const pscMap = await loadPscToDistrictMap(supabase);
  console.log(
    `  kategorií: ${categoryMap.size}, PSČ→okres entries: ${pscMap.size}`
  );

  console.log("[3/4] Stream-parseruji ZIP + XML...");
  const stats: Stats = {
    parsed: 0,
    filtered_inactive: 0,
    filtered_nace: 0,
    kept: 0,
    upserted: 0,
  };
  const buffer: GhostRow[] = [];

  const { iterate } = await openZipEntries(zipPath);

  await iterate(async (entryName, stream) => {
    console.log(`  entry: ${entryName}`);
    for await (const subject of parseAresXmlStream(stream)) {
      stats.parsed++;
      if (stats.parsed >= LIMIT) break;

      if (!isRelevantNace(subject.czNace)) {
        stats.filtered_nace++;
        continue;
      }
      if (!isActive(subject)) {
        stats.filtered_inactive++;
        continue;
      }

      const row = mapToGhostRow(subject, categoryMap, pscMap);
      if (!row) continue;
      stats.kept++;
      buffer.push(row);

      if (buffer.length >= BATCH_SIZE) {
        const n = await upsertBatch(supabase, buffer.splice(0));
        stats.upserted += n;
        process.stdout.write(
          `  parsed=${stats.parsed.toLocaleString()} kept=${stats.kept.toLocaleString()} upserted=${stats.upserted.toLocaleString()}\r`
        );
      }
    }
  });

  if (buffer.length > 0) {
    const n = await upsertBatch(supabase, buffer);
    stats.upserted += n;
  }

  console.log("\n[4/4] Hotovo:");
  console.log(`  parsed:         ${stats.parsed.toLocaleString()}`);
  console.log(`  filtered NACE:  ${stats.filtered_nace.toLocaleString()}`);
  console.log(`  filtered inactive: ${stats.filtered_inactive.toLocaleString()}`);
  console.log(`  kept:           ${stats.kept.toLocaleString()}`);
  console.log(`  upserted:       ${stats.upserted.toLocaleString()}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

// Suppress unused import warning for createReadStream — yauzl uses it internally
void createReadStream;
