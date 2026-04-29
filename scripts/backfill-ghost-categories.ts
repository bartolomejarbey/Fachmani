/**
 * backfill-ghost-categories.ts
 * ============================
 * Jednorázový backfill: přepočítá `ghost_subjects.category_ids` ze současných
 * `cz_nace` pomocí nového mapping modulu (lib/ares/nace-categories).
 *
 * Spuštění:
 *   $ SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/backfill-ghost-categories.ts
 *
 * Volitelně:
 *   DRY_RUN=1     — jen logy, žádný update
 *   BATCH=1000    — velikost batche pro select+update (default 1000)
 *   ONLY_EMPTY=1  — přepočítat jen ghosty s prázdným category_ids
 *
 * Vlastnosti:
 *   - Idempotent: opakovaný run nemění nic, pokud se mapping nezměnil.
 *   - Postupuje stránkami po `id` (lexikografické řazení = stabilní paginace).
 *   - Update jen ty řádky, kde se nový set kategorií reálně liší od stávajícího.
 */

// @ts-nocheck — Supabase typed client se v scripts/ nesnáší se strict mode
import { createClient } from "@supabase/supabase-js";
import { naceToCategoryIds, type CategoryRef } from "../lib/ares/nace-categories";

const BATCH = Number(process.env.BATCH ?? 1000);
const DRY_RUN = process.env.DRY_RUN === "1";
const ONLY_EMPTY = process.env.ONLY_EMPTY === "1";

type GhostMini = {
  ico: string;
  cz_nace: string[] | null;
  category_ids: string[] | null;
};

function setEqualUnordered(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

async function loadCategorySlugMap(supabase: any) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, parent_id");
  if (error) throw new Error(`Načtení kategorií selhalo: ${error.message}`);
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

async function* iterateGhosts(supabase: any): AsyncGenerator<GhostMini[]> {
  let lastIco: string | null = null;
  while (true) {
    let query = supabase
      .from("ghost_subjects")
      .select("ico, cz_nace, category_ids")
      .order("ico", { ascending: true })
      .limit(BATCH);

    if (ONLY_EMPTY) {
      query = query.eq("category_ids", "{}");
    }
    if (lastIco) {
      query = query.gt("ico", lastIco);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Select selhal: ${error.message}`);

    const rows = (data ?? []) as GhostMini[];
    if (rows.length === 0) return;
    yield rows;
    lastIco = rows[rows.length - 1].ico;
    if (rows.length < BATCH) return;
  }
}

async function applyUpdates(
  supabase: any,
  updates: Array<{ ico: string; category_ids: string[] }>,
): Promise<number> {
  if (updates.length === 0) return 0;
  if (DRY_RUN) return updates.length;

  // Updáty děláme po jednom — Postgrest neumí bulk update s různými hodnotami
  // (upsert by přepsal i ostatní sloupce a vyžadoval by full row).
  // Pro 290k řádků a typický change-rate ~50 % to dá ~150 k updatů; každý
  // přes ico=eq a where category_ids je rychlý díky PK.
  let count = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("ghost_subjects")
      .update({ category_ids: u.category_ids })
      .eq("ico", u.ico);
    if (error) {
      console.error(`  update IČO ${u.ico} selhal: ${error.message}`);
      continue;
    }
    count++;
  }
  return count;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Chybí env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("[1/3] Načítám categories slug map...");
  const slugMap = await loadCategorySlugMap(supabase);
  console.log(`  načteno ${slugMap.size} kategorií`);
  if (slugMap.size === 0) {
    throw new Error("Žádné kategorie nenalezeny — RLS blokuje?");
  }

  console.log(`[2/3] Backfilluji ghost_subjects ${ONLY_EMPTY ? "(jen prázdné)" : "(všechny)"}...`);
  if (DRY_RUN) console.log("  DRY_RUN=1 — žádný update se neprovede");

  let scanned = 0;
  let changed = 0;
  let updated = 0;
  let unchanged = 0;
  const startedAt = Date.now();

  for await (const batch of iterateGhosts(supabase)) {
    const updates: Array<{ ico: string; category_ids: string[] }> = [];
    for (const g of batch) {
      scanned++;
      const naces = g.cz_nace ?? [];
      const newIds = naceToCategoryIds(naces, slugMap);
      const currentIds = g.category_ids ?? [];
      if (setEqualUnordered(newIds, currentIds)) {
        unchanged++;
        continue;
      }
      changed++;
      updates.push({ ico: g.ico, category_ids: newIds });
    }
    const applied = await applyUpdates(supabase, updates);
    updated += applied;

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    process.stdout.write(
      `  scanned=${scanned.toLocaleString()} changed=${changed.toLocaleString()} updated=${updated.toLocaleString()} unchanged=${unchanged.toLocaleString()} (${elapsed}s)\r`,
    );
  }

  console.log("\n[3/3] Hotovo:");
  console.log(`  scanned:   ${scanned.toLocaleString()}`);
  console.log(`  changed:   ${changed.toLocaleString()}`);
  console.log(`  updated:   ${updated.toLocaleString()}${DRY_RUN ? " (DRY_RUN)" : ""}`);
  console.log(`  unchanged: ${unchanged.toLocaleString()}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
