import type { MetadataRoute } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://fachmani.org";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServer();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/fachmani`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/kategorie`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/poptavky`, changeFrequency: "daily", priority: 0.7 },
  ];

  const [{ data: categories }, { data: providers }, { data: seeds }] = await Promise.all([
    supabase.from("categories").select("slug").not("slug", "is", null),
    supabase
      .from("profiles")
      .select("slug")
      .eq("role", "provider")
      .not("slug", "is", null),
    supabase
      .from("seed_providers")
      .select("slug")
      .eq("is_active", true)
      .not("slug", "is", null),
  ]);

  const categoryEntries: MetadataRoute.Sitemap =
    (categories || []).map((c) => ({
      url: `${SITE_URL}/kategorie/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || [];

  const providerEntries: MetadataRoute.Sitemap = [
    ...(providers || []).map((p) => ({
      url: `${SITE_URL}/fachmani/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(seeds || []).map((s) => ({
      url: `${SITE_URL}/fachmani/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [...staticEntries, ...categoryEntries, ...providerEntries];
}
