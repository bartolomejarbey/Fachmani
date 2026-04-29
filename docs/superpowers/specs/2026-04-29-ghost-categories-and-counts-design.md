# Ghost categories backfill + unified counts

**Status:** approved (full-auto)
**Author:** Claude (Opus 4.7)
**Date:** 2026-04-29

## Problem

After the ARES bulk import we have 289 870 active, unclaimed `ghost_subjects` in
production. Two issues block them from being useful:

1. **Categories are too coarse.** The import script's `NACE_TO_CATEGORY_KEY` map
   covers only 18 prefixes and most subjects end up tagged only as
   `stavebnictvi` (top-level) because their `cz_nace[]` contains `41xx`/`42xx`/
   `43xx`. A landscaping company with NACE `8121`+`9521` but no `41-43` prefix
   gets nothing. Result: clicking "Úklid" on `/fachmani` reveals ~0 ghosts.
2. **Counts are wrong / capped.** `/fachmani` shows max 508 fachmanů because of
   `.limit(500)` on the ghost query. The homepage `loadStats` ignores ghosts
   entirely (returns 8). Users have no idea the platform actually covers ~290k
   subjects.

## Goals

1. Each ghost gets accurate `category_ids[]` derived from its full
   `cz_nace[]`, including both the matching subcategory and its parent
   top-level UUID (so that filtering by either works).
2. Homepage hero shows `real + seed + active unclaimed ghosts` count.
3. `/fachmani` shows the same total and paginates ghosts server-side
   (no 500 cap).

## Out of scope

- "Facebook scale" infrastructure (read replicas, search index, fanout queues).
  Defer until traffic justifies it; design as separate spec when there's
  evidence of scaling pain.
- Reviewing the existing NACE→slug mapping with a domain expert. Ship with my
  best-effort map (~80 prefixes), expect tuning later.
- Localized count display (1 fachman / 2 fachmani / 5 fachmanů) for ghost
  pagination — handled separately if/when grammar is wrong.

## Architecture

### Module: `lib/ares/nace-categories.ts`

Single source of truth for the NACE → category mapping. Used by:
- `scripts/import-ares-ghost.ts` (new ghost inserts)
- `scripts/backfill-ghost-categories.ts` (one-time backfill of existing 290k)
- Future ghost-claim flow (when a user claims a ghost we resolve their
  `provider_categories` from the same map).

Public surface:

```ts
// Pure function: NACE codes → unique category slugs.
// Lookup is longest-prefix-wins (5→4→3→2 digits).
export function naceToSlugs(naces: string[]): string[];

// Slugs → category_ids[], including parent UUIDs (for filter expansion).
export function slugsToCategoryIds(
  slugs: string[],
  categoryBySlug: Map<string, { id: string; parent_id: string | null }>,
): string[];

// Convenience composition for the import/backfill scripts.
export function naceToCategoryIds(
  naces: string[],
  categoryBySlug: Map<string, { id: string; parent_id: string | null }>,
): string[];
```

Mapping covers ~80 NACE prefixes derived from sampling 1 000 real ghost
records: stavebnictvi, instalater, elektrikar, malir, podlahar, truhlar,
zamecnictvi, autoservis, doprava, IT, marketing, fotograf, ucetnictvi, uklid,
udrzba-zelene, krejci, oprava-spotrebicu, hlidani, etc.

### Backfill script: `scripts/backfill-ghost-categories.ts`

Runs once after the new mapping ships:

```
for each ghost in batches of 1 000:
  newIds = naceToCategoryIds(ghost.cz_nace, categoryBySlug)
  if newIds differs from ghost.category_ids:
    upsert ghost with new category_ids
```

Idempotent (safe to re-run). Uses `SUPABASE_SERVICE_ROLE_KEY`. Supports
`--dry-run`.

### Import script changes

Replace inline `NACE_TO_CATEGORY_KEY` and `deriveCategoryIds` with the new
shared module. Behavioral diff: more prefixes matched, parent UUIDs included.

### Homepage `loadStats`

Add a third count query:

```ts
const { count: ghostSubjects } = await supabase
  .from("ghost_subjects")
  .select("*", { count: "exact", head: true })
  .is("claimed_at", null)
  .eq("is_active", true);

setStats({
  providers: (realProviders ?? 0) + (seedProviders ?? 0) + (ghostSubjects ?? 0),
  ...
});
```

`count: "exact", head: true` is cheap (a single COUNT(*) on an indexed table —
the existing partial index `ghost_subjects_active_visible_idx` covers it).

### `/fachmani` server-side pagination

Drop the 500 cap. Move filter logic into the Supabase query:

```ts
let query = supabase
  .from("ghost_subjects")
  .select("ico, name, ...", { count: "exact" })
  .is("claimed_at", null)
  .eq("is_active", true)
  .range(offset, offset + PAGE_SIZE - 1)
  .order("name");

if (selectedRegion) query = query.eq("region_id", selectedRegion);
if (selectedDistrict) query = query.eq("district_id", selectedDistrict);
if (selectedCategoryIds.length) query = query.overlaps("category_ids", selectedCategoryIds);
```

Real + seed (typically <100 rows total) keep their current client-side filter
flow — they're cheap and small. Ghost rows refetch when filters or page change.

UI pattern: keep the existing `Pagination` component but compute total pages
from `realCount + seedCount + ghostCount`. Use a single "page index" — the
first N pages show real+seed (sorted), the remainder show ghost rows in
batches. Concretely: collect `realFiltered + seedFiltered` once into one array,
slice by page; ghost pages start at `Math.ceil(realPlusSeed.length /
PAGE_SIZE)` and fetch `range(ghostOffset, ghostOffset + PAGE_SIZE - 1)`.

## Data flow

```
ARES JSON → import-ares-ghost.ts → ghost_subjects (cz_nace + category_ids via shared map)

backfill-ghost-categories.ts → bulk update existing rows' category_ids

/fachmani:
  filter changes → query ghost_subjects with filters + count + range
  display: real+seed at top of paginated list, ghosts after
  hero/footer count: real + seed + ghost_count

homepage:
  loadStats: real + seed + ghost_count → displayed in hero "X profesionálů"
```

## Error handling

- NACE map miss: subject ends up with `category_ids = [parent UUIDs only]`
  for whatever prefixes did match, or `[]` if none. Empty `[]` is acceptable;
  the subject still appears under "all categories".
- Ghost count query fails on homepage: silently fallback to `real + seed`
  (current behavior). Don't block hero render on a count.
- /fachmani ghost pagination fails: show error inline, real+seed still
  visible.

## Testing

- `lib/ares/nace-categories.test.ts` (Vitest):
  - Real ARES samples → expected slugs
  - Multiple NACE codes → deduped, parent included
  - Empty / unknown NACE → empty result
  - Longest-prefix-wins (e.g. `4321` → `elektrikar`, not generic `43`)
- Manual smoke after backfill:
  - `select count(*) from ghost_subjects where category_ids = '{}'` should
    drop dramatically (target <5%)
  - `/fachmani?kategorie=<elektrikar UUID>` shows only electricians
  - Homepage hero count ≈ 289 878

## Migration / rollout

1. Land mapping module + tests (no DB change).
2. Land import script refactor + backfill script (no DB change — script
   updates rows in place).
3. Run backfill in staging, sanity check counts per category.
4. Run backfill in prod.
5. Land homepage + /fachmani UI changes.
6. Verify counts visually.

No SQL migrations needed; the schema already supports everything.
