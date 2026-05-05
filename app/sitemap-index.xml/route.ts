import { createClient } from "@supabase/supabase-js";

// Next.js 16 + `generateSitemaps()` v `app/sitemap.ts` registruje route `/sitemap.xml`
// (i když ji v dev neserveruje), takže manuální index handler musí ležet na jiné cestě.
// `robots.ts` referencuje právě `/sitemap-index.xml`, takže discovery probíhá přes robots.txt.
//
// Drž `GHOST_CHUNK_SIZE` synchronně s `app/sitemap.ts`.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");
const GHOST_CHUNK_SIZE = 10_000;

export const revalidate = 86_400;

async function getActiveGhostCount(): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { count } = await supabase
    .from("ghost_subjects")
    .select("ico", { count: "exact", head: true })
    .is("claimed_at", null)
    .eq("is_active", true)
    .eq("gdpr_suppressed", false);
  return count ?? 0;
}

export async function GET(): Promise<Response> {
  const ghostCount = await getActiveGhostCount();
  const ghostChunks = Math.ceil(ghostCount / GHOST_CHUNK_SIZE);
  const total = 1 + ghostChunks;
  const lastmod = new Date().toISOString();

  const entries: string[] = [];
  for (let i = 0; i < total; i++) {
    entries.push(
      `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${i}.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join("\n") +
    `\n</sitemapindex>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
