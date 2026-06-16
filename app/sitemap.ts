import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");

// Sitemap protocol allows up to 50 000 URL na soubor — držíme se 10 000 pro pohodlnou rezervu.
const GHOST_CHUNK_SIZE = 10_000;
// Supabase PostgREST default page = 1000.
const SUPABASE_PAGE = 1_000;

// Re-build sitemapy nejvýše jednou za 24 h — ghost záznamy se mění pomalu (denní sync),
// úvodní + provider chunk je bezpečné cachovat.
export const revalidate = 86_400;

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getActiveGhostCount(): Promise<number> {
  const supabase = anonClient();
  const { count } = await supabase
    .from("ghost_subjects")
    .select("ico", { count: "exact", head: true })
    .is("claimed_at", null)
    .eq("is_active", true)
    .eq("gdpr_suppressed", false);
  return count ?? 0;
}

// Next.js 15+ doručuje `id` jako Promise<string> (parsed z URL `/sitemap/N.xml`).
// Vrací čísla (Next je sám stringifikuje do URL).
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const ghostCount = await getActiveGhostCount();
  const ghostChunks = Math.ceil(ghostCount / GHOST_CHUNK_SIZE);
  // id 0 = úvodní + kategorie + reální + seed provideři
  // id 1..N = ghost chunky (každý 10 000 URL)
  return [
    { id: 0 },
    ...Array.from({ length: ghostChunks }, (_, i) => ({ id: i + 1 })),
  ];
}

type StaticPage = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

const STATIC_PAGES: StaticPage[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/fachmani", priority: 0.9, changeFrequency: "daily" },
  { path: "/kategorie", priority: 0.8, changeFrequency: "weekly" },
  { path: "/poptavky", priority: 0.7, changeFrequency: "daily" },
  { path: "/hledat", priority: 0.5, changeFrequency: "weekly" },
  { path: "/feed", priority: 0.4, changeFrequency: "daily" },
  { path: "/poradce", priority: 0.5, changeFrequency: "monthly" },
  { path: "/jak-to-funguje", priority: 0.4, changeFrequency: "monthly" },
  { path: "/pro-fachmany", priority: 0.4, changeFrequency: "monthly" },
  { path: "/cenik", priority: 0.4, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.4, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.4, changeFrequency: "monthly" },
  { path: "/vop", priority: 0.2, changeFrequency: "yearly" },
  { path: "/gdpr", priority: 0.2, changeFrequency: "yearly" },
];

async function buildMainChunk(): Promise<MetadataRoute.Sitemap> {
  const supabase = anonClient();
  const now = new Date();

  const out: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Kategorie — slug-based veřejné stránky (main i sub)
  const { data: cats } = await supabase
    .from("categories")
    .select("slug, parent_id")
    .eq("is_active", true);
  for (const c of cats ?? []) {
    if (!c.slug) continue;
    out.push({
      url: `${SITE_URL}/kategorie/${c.slug}`,
      lastModified: now,
      changeFrequency: c.parent_id === null ? "weekly" : "monthly",
      priority: c.parent_id === null ? 0.7 : 0.5,
    });
  }

  // Reální provideři — `/fachman/{uuid}`. Sub plán = vyšší priorita.
  const { data: realProviders } = await supabase
    .from("profiles")
    .select("id, subscription_type, updated_at")
    .eq("role", "provider");
  for (const p of realProviders ?? []) {
    out.push({
      url: `${SITE_URL}/fachman/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority:
        p.subscription_type === "business" ? 0.8
        : p.subscription_type === "premium" ? 0.7
        : 0.5,
    });
  }

  // Seed provideři — URL pattern `/fachman/seed_{id}` (viz fachmani/page.tsx:220 + fachman/[id]/page.tsx:54)
  const { data: seedProviders } = await supabase
    .from("seed_providers")
    .select("id, updated_at")
    .eq("is_active", true);
  for (const s of seedProviders ?? []) {
    out.push({
      url: `${SITE_URL}/fachman/seed_${s.id}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return out;
}

// In-memory cache pro ghost chunky — drží sjednocený výsledek napříč chunk requesty.
// Kompletní crawl (~290k záznamů přes keyset) trvá desítky vteřin; cache TTL = revalidate (24 h),
// takže v produkci běží crawl max 1× denně. V dev session přežije do restartu.
type GhostChunks = MetadataRoute.Sitemap[]; // index N = chunk N (0..ghostChunks-1)
let cachedGhostChunks: GhostChunks | null = null;
let cachedAt = 0;
let inflight: Promise<GhostChunks> | null = null;

async function crawlAllGhostChunks(): Promise<GhostChunks> {
  const supabase = anonClient();
  const chunks: GhostChunks = [];
  let current: MetadataRoute.Sitemap = [];
  let lastIco = ""; // PostgreSQL string compare — `""` je menší než kterýkoli 8-cifry IČO

  // Keyset pagination přes PK (ico) — eliminuje OFFSET timeout na velkých posunech.
  // PostgREST má hard limit 1000 řádků/req; chunk = 10 × 1000.
  while (true) {
    const { data, error } = await supabase
      .from("ghost_subjects")
      .select("ico, last_synced_at")
      .is("claimed_at", null)
      .eq("is_active", true)
      .eq("gdpr_suppressed", false)
      .gt("ico", lastIco)
      .order("ico", { ascending: true })
      .limit(SUPABASE_PAGE);

    if (error) {
      console.error("[sitemap] ghost crawl error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const g of data) {
      current.push({
        url: `${SITE_URL}/fachman/ghost/${g.ico}`,
        lastModified: g.last_synced_at ? new Date(g.last_synced_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.3,
      });
      if (current.length === GHOST_CHUNK_SIZE) {
        chunks.push(current);
        current = [];
      }
    }

    lastIco = data[data.length - 1].ico;
    if (data.length < SUPABASE_PAGE) break;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function getGhostChunks(): Promise<GhostChunks> {
  const now = Date.now();
  if (cachedGhostChunks && now - cachedAt < revalidate * 1000) {
    return cachedGhostChunks;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const chunks = await crawlAllGhostChunks();
      cachedGhostChunks = chunks;
      cachedAt = Date.now();
      return chunks;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function buildGhostChunk(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  const chunks = await getGhostChunks();
  return chunks[chunkIndex] ?? [];
}

export default async function sitemap({ id }: { id: Promise<string> | string | number }): Promise<MetadataRoute.Sitemap> {
  // Next.js 15+ async params: id přichází jako Promise<string>; v dřívějších verzích jako number.
  const resolved = await Promise.resolve(id);
  const idNum = typeof resolved === "string" ? Number(resolved) : resolved;
  if (!Number.isFinite(idNum)) return [];
  if (idNum === 0) return buildMainChunk();
  return buildGhostChunk(idNum - 1);
}
