import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Public lookup tabulky (categories, regions, districts) jsou identické pro všechny
// uživatele a mění se výhradně přes admin. Cache je proto bezpečná i mimo per-request
// supabase klienta. Anon klient bez cookies = žádná auth, čistá RLS read.
const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export type CachedCategory = {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
};

export type CachedRegion = {
  id: string;
  code: string;
  name_cs: string;
  sort_order: number | null;
};

export type CachedDistrict = {
  id: string;
  code: string;
  name_cs: string;
  region_id: string;
  sort_order: number | null;
};

// 1 hodina cache — admin změny propagují na další revalidaci. Lze invalidovat tagem.
export const getCachedCategories = unstable_cache(
  async (): Promise<CachedCategory[]> => {
    const { data } = await anonSupabase
      .from("categories")
      .select("id, name, icon, parent_id, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name");
    return (data as CachedCategory[]) ?? [];
  },
  ["lookup-categories"],
  { revalidate: 3600, tags: ["lookups", "categories"] }
);

export const getCachedRegions = unstable_cache(
  async (): Promise<CachedRegion[]> => {
    const { data } = await anonSupabase
      .from("regions")
      .select("id, code, name_cs, sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name_cs");
    return (data as CachedRegion[]) ?? [];
  },
  ["lookup-regions"],
  { revalidate: 3600, tags: ["lookups", "regions"] }
);

export const getCachedDistricts = unstable_cache(
  async (): Promise<CachedDistrict[]> => {
    const { data } = await anonSupabase
      .from("districts")
      .select("id, code, name_cs, region_id, sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name_cs");
    return (data as CachedDistrict[]) ?? [];
  },
  ["lookup-districts"],
  { revalidate: 3600, tags: ["lookups", "districts"] }
);
