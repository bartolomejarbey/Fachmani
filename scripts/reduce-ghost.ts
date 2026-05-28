/**
 * reduce-ghost.ts
 * ===============
 * Jednorázové snížení ghost_subjects na ~2000 kurátorovaných řemeslníků:
 *   - rozsah: Jihočeský kraj + Kraj Vysočina + okres Benešov
 *   - jen živnostníci (legal_form 101) a s.r.o. (112) → vyloučí státní podniky apod.
 *   - rovnoměrně ~667 z každé ze 3 oblastí, náhodný výběr napříč obory
 *   - vše ostatní (mimo rozsah, jiné právní formy, přebytek) NEVRATNĚ smazáno
 *
 * Spuštění SQL přes Supabase Management API (PAT v SUPABASE_ACCESS_TOKEN).
 */
import "./_load-env";

const PROJECT_REF = "msqxeztzyrrrvgwqsatx";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
if (!TOKEN) throw new Error("Chybí SUPABASE_ACCESS_TOKEN");

// region/district id (ověřeno dotazem do DB)
const JIHOCESKY = "a72847ee-c145-43d2-bce7-572c8ab02fff";
const VYSOCINA = "c1960bd9-f132-4cdb-b85a-0a0503ee5532";
const BENESOV = "ea1a174a-47ba-44bd-a57a-85fc5d3219e7";

async function runSql(query: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function count(label: string) {
  const r = await runSql(
    `select count(*)::int as n from public.ghost_subjects where is_active = true and claimed_at is null;`
  );
  console.log(label, JSON.stringify(r));
}

async function main() {
  await count("PŘED:");

  const sql = `
SET statement_timeout = 0;
WITH scope AS (
  SELECT ico,
    CASE
      WHEN district_id = '${BENESOV}' THEN 'benesov'
      WHEN region_id  = '${JIHOCESKY}' THEN 'jc'
      WHEN region_id  = '${VYSOCINA}'  THEN 'vy'
    END AS bucket
  FROM public.ghost_subjects
  WHERE is_active = true
    AND claimed_at IS NULL
    AND legal_form IN ('101','112')
    AND (region_id IN ('${JIHOCESKY}','${VYSOCINA}') OR district_id = '${BENESOV}')
),
ranked AS (
  SELECT ico, bucket,
         row_number() OVER (PARTITION BY bucket ORDER BY random()) AS rn
  FROM scope
),
keep AS (
  SELECT ico FROM ranked
  WHERE (bucket = 'jc'      AND rn <= 667)
     OR (bucket = 'vy'      AND rn <= 667)
     OR (bucket = 'benesov' AND rn <= 666)
)
DELETE FROM public.ghost_subjects gs
WHERE gs.claimed_at IS NULL
  AND gs.ico NOT IN (SELECT ico FROM keep);
`;
  console.log("Mažu… (může pár sekund trvat)");
  const r = await runSql(sql);
  console.log("DELETE výsledek:", JSON.stringify(r));

  await count("PO:");

  // rozpad podle oblastí
  const breakdown = await runSql(`
    select
      sum(case when district_id = '${BENESOV}' then 1 else 0 end)::int as benesov,
      sum(case when region_id  = '${JIHOCESKY}' and district_id <> '${BENESOV}' then 1 else 0 end)::int as jihocesky,
      sum(case when region_id  = '${VYSOCINA}'  then 1 else 0 end)::int as vysocina,
      count(*)::int as total
    from public.ghost_subjects where is_active = true;
  `);
  console.log("Rozpad:", JSON.stringify(breakdown));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
