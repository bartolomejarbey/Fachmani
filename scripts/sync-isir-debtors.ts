/**
 * sync-isir-debtors.ts
 * =====================
 * Denní sync z Insolvenčního rejstříku (ISIR / dataor.justice.cz):
 *  1. Stáhne aktuální XML feed insolventních dlužníků.
 *  2. Stream-parseruje XML (sax) a extrahuje IČO + číslo řízení + stav.
 *  3. Upsertne do public.isir_debtors.
 *  4. Volá RPC flag_ghost_subjects_from_isir() která označí ghost_subjects.
 *
 * Spuštění:
 *   $ ISIR_FEED_URL="https://isir.justice.cz/.../dump.xml" \
 *     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/sync-isir-debtors.ts
 *
 * Cron: denně v 04:00 (po nočním ISIR refresh). Lze řešit Supabase pg_cron,
 * GitHub Action s cron schedule, nebo Vercel cron.
 *
 * URL feedu:
 *   ISIR poskytuje SOAP/REST endpointy a denní XML snapshoty.
 *   Endpoint je stabilní per provozovatel — nutno zjistit z https://isir.justice.cz/
 *   (Open data sekce / WebService dokumentace).
 *
 * XML schema (zjednodušeně, viz isir2.xsd):
 *   <RootIs>
 *     <Vec>
 *       <id>...</id>
 *       <spisovaZnacka>INS 12345/2024</spisovaZnacka>
 *       <stavRizeni>PROBIHA</stavRizeni>
 *       <Ucastnik typ="DLUZNIK">
 *         <Subjekt>
 *           <ic>27082440</ic>
 *         </Subjekt>
 *       </Ucastnik>
 *     </Vec>
 *     ...
 *   </RootIs>
 *
 * POZNÁMKA: Skutečné názvy elementů ISIR XML nejsou v této chvíli ověřeny.
 * Spusť poprvé s ISIR_DRY_RUN=1 a podívej se na první výstup.
 */

// @ts-nocheck — Supabase typed client se v scripts/ nesnáší se strict mode
import { createClient } from "@supabase/supabase-js";
import sax from "sax";

type IsirDebtor = {
  ico: string;
  case_number: string | null;
  case_state: string | null;
  last_event_type: string | null;
  last_event_date: string | null;
};

const BATCH_SIZE = 500;
const DRY_RUN = process.env.ISIR_DRY_RUN === "1";

// -------------------------------------------------------------------------
// Stream parser
// -------------------------------------------------------------------------
function parseIsirXmlStream(
  stream: NodeJS.ReadableStream
): AsyncIterable<IsirDebtor> {
  return {
    [Symbol.asyncIterator]() {
      const parser = sax.createStream(true, { trim: true });
      const queue: IsirDebtor[] = [];
      let resolveNext: ((v: IteratorResult<IsirDebtor>) => void) | null = null;
      let ended = false;

      const stack: string[] = [];
      let inVec = false;
      let inDluznikSubjekt = false;
      let currentCase: Partial<IsirDebtor> & { _icos: Set<string> } = {
        _icos: new Set(),
      };
      let textBuffer = "";

      const flushAll = () => {
        if (resolveNext) {
          if (queue.length > 0) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: queue.shift()!, done: false });
          } else if (ended) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: undefined as unknown as IsirDebtor, done: true });
          }
        }
      };

      parser.on("opentag", (node) => {
        const name = node.name;
        stack.push(name);
        textBuffer = "";

        if (name === "Vec" || name === "vec") {
          inVec = true;
          currentCase = { _icos: new Set() };
        } else if (
          inVec &&
          (name === "Ucastnik" || name === "ucastnik") &&
          (node.attributes.typ === "DLUZNIK" ||
            node.attributes.Typ === "DLUZNIK")
        ) {
          inDluznikSubjekt = true;
        }
      });

      parser.on("text", (t) => {
        textBuffer += t;
      });
      parser.on("cdata", (t) => {
        textBuffer += t;
      });

      parser.on("closetag", (name) => {
        const txt = textBuffer.trim();
        textBuffer = "";

        if (inVec) {
          if (name === "spisovaZnacka" || name === "SpisovaZnacka")
            currentCase.case_number = txt;
          else if (name === "stavRizeni" || name === "StavRizeni")
            currentCase.case_state = txt;
          else if (name === "typUdalost" || name === "TypUdalost")
            currentCase.last_event_type = txt;
          else if (name === "datumUdalosti" || name === "DatumUdalosti")
            currentCase.last_event_date = txt;
          else if (
            inDluznikSubjekt &&
            (name === "ic" || name === "Ic") &&
            /^[0-9]{8}$/.test(txt)
          ) {
            currentCase._icos.add(txt);
          } else if (name === "Ucastnik" || name === "ucastnik") {
            inDluznikSubjekt = false;
          }
        }

        if (name === "Vec" || name === "vec") {
          // Filtr: jen probíhající insolvence
          const probiha =
            currentCase.case_state === "PROBIHA" ||
            currentCase.case_state === "ZAHAJENO";
          if (probiha) {
            for (const ico of currentCase._icos) {
              queue.push({
                ico,
                case_number: currentCase.case_number ?? null,
                case_state: currentCase.case_state ?? null,
                last_event_type: currentCase.last_event_type ?? null,
                last_event_date: currentCase.last_event_date ?? null,
              });
            }
            flushAll();
          }
          inVec = false;
          currentCase = { _icos: new Set() };
        }

        stack.pop();
      });

      parser.on("end", () => {
        ended = true;
        flushAll();
      });

      stream.pipe(parser);

      return {
        next(): Promise<IteratorResult<IsirDebtor>> {
          if (queue.length > 0)
            return Promise.resolve({ value: queue.shift()!, done: false });
          if (ended)
            return Promise.resolve({
              value: undefined as unknown as IsirDebtor,
              done: true,
            });
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
      };
    },
  };
}

// -------------------------------------------------------------------------
// Upsert
// -------------------------------------------------------------------------
async function upsertBatch(supabase: any, batch: IsirDebtor[]) {
  if (batch.length === 0) return;
  if (DRY_RUN) {
    console.log(`[dry-run] would upsert ${batch.length} debtors`);
    return;
  }
  const { error } = await supabase
    .from("isir_debtors")
    .upsert(batch, { onConflict: "ico" });
  if (error) throw new Error(`isir_debtors upsert: ${error.message}`);
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
async function main() {
  const url = process.env.ISIR_FEED_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !supabaseUrl || !serviceKey) {
    throw new Error(
      "Chybí env: ISIR_FEED_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("[1/3] Streamuji ISIR feed:", url);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Feed download HTTP ${res.status}`);
  }

  // Node 18+ — fetch returns Web ReadableStream; převedeme na Node stream.
  const { Readable } = await import("node:stream");
  const nodeStream = Readable.fromWeb(res.body as any);

  let total = 0;
  const buffer: IsirDebtor[] = [];

  for await (const debtor of parseIsirXmlStream(nodeStream)) {
    total++;
    buffer.push(debtor);
    if (buffer.length >= BATCH_SIZE) {
      await upsertBatch(supabase, buffer.splice(0));
      process.stdout.write(`  upserted: ${total.toLocaleString()}\r`);
    }
  }
  if (buffer.length > 0) await upsertBatch(supabase, buffer);
  console.log(`\n[2/3] Upsert hotov: ${total.toLocaleString()} dlužníků`);

  console.log("[3/3] Flaguji ghost_subjects...");
  if (!DRY_RUN) {
    const { error } = await supabase.rpc("flag_ghost_subjects_from_isir");
    if (error) throw new Error(`flag_ghost RPC: ${error.message}`);
  }

  console.log("Hotovo.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
