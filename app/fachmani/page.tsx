import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  getCachedCategories,
  getCachedRegions,
  getCachedDistricts,
} from "@/lib/cachedLookups";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import CategoryIcon from "@/app/components/CategoryIcon";
import FachmaniFilters from "./FachmaniFilters";
import PaginationLinks from "./PaginationLinks";
import { isIosAppRequest } from "@/lib/native-server";

const PAGE_SIZE = 12;

// SSR vyžadováno smlouvou (SEO crawl). Filtry & paginace jsou URL-driven, takže každý
// kombinaci search/page lze nasdílet a indexovat. Ghost vrstva (290k subjektů) se
// dotahuje serverově s key/range stránkováním proti `ghost_subjects`.
export const dynamic = "force-dynamic";

type SP = Promise<{
  kategorie?: string;
  kraj?: string;
  okres?: string;
  overeni?: string;
  q?: string;
  page?: string;
}>;

type Category = {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
};

type Region = { id: string; code: string; name_cs: string; sort_order: number | null };
type District = { id: string; code: string; name_cs: string; region_id: string; sort_order: number | null };

type Fachman = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  bank_verified: boolean;
  subscription_type: string;
  bio: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  region_id: string | null;
  district_id: string | null;
  categories: { id: string; name: string; icon: string }[];
  rating: number;
  review_count: number;
  is_seed: boolean;
  is_ghost?: boolean;
  ghost_ico?: string;
  has_promo: boolean;
  promo_type: string | null;
};

export const metadata: Metadata = {
  title: "Najděte svého fachmana | Fachmani",
  description:
    "Tisíce ověřených fachmanů (řemeslníci, údržbáři, IT, doprava, péče…) k zadání poptávky. Filtruj podle kraje, okresu a kategorie.",
  alternates: { canonical: "/fachmani" },
  openGraph: {
    title: "Najděte svého fachmana",
    description: "Ověření profesionálové připravení vám pomoct.",
    type: "website",
    url: "/fachmani",
  },
};

function clampPage(raw: string | undefined, totalPages: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.max(1, Math.floor(n)), Math.max(1, totalPages));
}

export default async function FachmaniPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  // App Store: v iOS aplikaci nezobrazujeme fiktivní (seed) ani ghost (ARES) profily —
  // jen reálné registrované uživatele. onIosApp vypne oba bloky níže.
  const onIosApp = await isIosAppRequest();

  // --- LOOKUPS (kategorie, kraje, okresy) ---
  // Tahnuto z `lib/cachedLookups` — unstable_cache 1h, šetří ~150 ms na každý request.
  const [categories, regions, districts] = await Promise.all([
    getCachedCategories(),
    getCachedRegions(),
    getCachedDistricts(),
  ]);

  // --- ROZKLAD URL PARAMS NA INTERNAL STATE ---
  const kategorieParam = sp.kategorie ?? "";
  const matchedCategory = kategorieParam ? categories.find((c) => c.id === kategorieParam) : undefined;
  // Pokud URL říká sub kategorii, naplníme oba: hlavní (parent) i sub.
  const selectedSub = matchedCategory && matchedCategory.parent_id !== null ? matchedCategory.id : "";
  const selectedMain = matchedCategory
    ? matchedCategory.parent_id ?? matchedCategory.id
    : "";

  const krajParam = sp.kraj ?? "";
  const matchedRegion = krajParam
    ? regions.find((r) => r.id === krajParam || r.code === krajParam)
    : undefined;
  const selectedRegion = matchedRegion?.id ?? "";

  const okresParam = sp.okres ?? "";
  const matchedDistrict = okresParam
    ? districts.find((d) => d.id === okresParam || d.code === okresParam)
    : undefined;
  const selectedDistrict = matchedDistrict?.id ?? "";
  // Když okres je v jiném kraji než selectedRegion, derive kraj z okresu.
  const effectiveRegion = matchedDistrict?.region_id ?? selectedRegion;

  const verifiedOnly = sp.overeni === "1" || sp.overeni === "true";
  const searchText = (sp.q ?? "").trim().slice(0, 200);

  // Sady IČkat — sub vyhrává, jinak hlavní + všechny její sub kategorie.
  const subCategories = categories.filter((c) => c.parent_id !== null);
  const categoryFilterIds: string[] = selectedSub
    ? [selectedSub]
    : selectedMain
    ? [selectedMain, ...subCategories.filter((c) => c.parent_id === selectedMain).map((c) => c.id)]
    : [];

  // --- REAL providers ---
  // Public feed: všichni registrovaní providers jsou vidět vždy.
  // (Trial řídí jen aktivní bidování — viz logika v /poptavka/[id], ne viditelnost v katalogu.)
  const all: Fachman[] = [];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_verified, bank_verification_status, subscription_type, region_id, district_id, created_at, trial_until")
    .eq("role", "provider")
    // Stabilní sekundární klíč (created_at, id) — bez něj mají shodné subscription_type
    // nedeterministické pořadí → při stránkování duplicitní/přeskočené karty.
    .order("subscription_type", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(2000);

  if (profilesData && profilesData.length > 0) {
    const providerIds = profilesData.map((p) => p.id);

    // provider_profiles + reviews + promotions can run in parallel (filtered by providerIds).
    // provider_categories must wait for provider_profile.id list — without the filter
    // PostgREST returns the entire join table (was the visible "subcategory selector lag").
    const [{ data: providerProfilesData }, { data: reviewsData }, { data: promosData }] = await Promise.all([
      supabase.from("provider_profiles").select("id, user_id, bio, hourly_rate, locations").in("user_id", providerIds),
      supabase.from("reviews").select("provider_id, rating").in("provider_id", providerIds),
      supabase
        .from("promotions")
        .select("provider_id, type")
        .eq("status", "active")
        .gte("ends_at", new Date().toISOString())
        .in("provider_id", providerIds),
    ]);

    const providerProfileIds = (providerProfilesData ?? []).map((pp) => pp.id);
    const { data: providerCategoriesData } = providerProfileIds.length
      ? await supabase
          .from("provider_categories")
          .select("provider_id, categories(id, name, icon)")
          .in("provider_id", providerProfileIds)
      : { data: [] as { provider_id: string; categories: { id: string; name: string; icon: string } | null }[] };

    profilesData.forEach((profile) => {
      const providerProfile = providerProfilesData?.find((pp) => pp.user_id === profile.id);
      const cats = providerCategoriesData?.filter((pc: { provider_id: string }) => pc.provider_id === providerProfile?.id) || [];
      const revs = reviewsData?.filter((r) => r.provider_id === profile.id) || [];
      const promo = promosData?.find((p) => p.provider_id === profile.id);

      const avgRating = revs.length > 0
        ? Math.round((revs.reduce((sum, r) => sum + r.rating, 0) / revs.length) * 10) / 10
        : 0;

      all.push({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url || null,
        is_verified: profile.is_verified,
        bank_verified:
          (profile as { bank_verification_status?: string | null }).bank_verification_status ===
          "verified",
        subscription_type: profile.subscription_type || "free",
        bio: providerProfile?.bio || null,
        hourly_rate: providerProfile?.hourly_rate || null,
        locations: providerProfile?.locations || null,
        region_id: profile.region_id || null,
        district_id: profile.district_id || null,
        categories: cats.flatMap((c) => {
          const cat = (c as unknown as { categories: { id: string; name: string; icon: string } | null }).categories;
          return cat ? [cat] : [];
        }),
        rating: avgRating,
        review_count: revs.length,
        is_seed: false,
        has_promo: !!promo,
        promo_type: promo?.type || null,
      });
    });
  }

  // --- SEED providers ---
  // App Store: na iOS seed (fiktivní/ARES) profily vůbec nenačítáme.
  const { data: seedData } = onIosApp
    ? { data: null }
    : await supabase.from("seed_providers").select("*").eq("is_active", true);
  if (seedData) {
    seedData.forEach((seed) => {
      const seedCategories = (seed.category_ids as string[] | null)
        ?.map((catId: string) => categories.find((c) => c.id === catId))
        .filter(Boolean) as { id: string; name: string; icon: string }[] || [];

      all.push({
        id: `seed_${seed.id}`,
        full_name: seed.full_name,
        avatar_url: seed.avatar_url || null,
        is_verified: seed.is_verified,
        bank_verified: false,
        subscription_type: "premium",
        bio: seed.bio,
        hourly_rate: seed.hourly_rate,
        locations: seed.locations,
        region_id: null,
        district_id: null,
        categories: seedCategories,
        rating: seed.rating || 0,
        review_count: seed.review_count || 0,
        is_seed: true,
        has_promo: true,
        promo_type: "top_profile",
      });
    });
  }

  // Sort tiers (per user instruction): real-unverified → real-verified → real-paying
  // → seed (ARES profil). Ghosti (ARES) jdou až za vším přes itemsToShow concat (ghostSlice).
  const tier = (f: Fachman): number => {
    if (f.is_seed) return 4;
    const isPaid = f.subscription_type === "premium" || f.subscription_type === "business";
    if (isPaid) return 3;
    if (f.is_verified) return 2;
    return 1;
  };
  all.sort((a, b) => {
    const tDiff = tier(a) - tier(b);
    if (tDiff !== 0) return tDiff;
    return b.rating - a.rating;
  });

  // --- FILTR REAL+SEED V PAMĚTI ---
  let realAndSeedFiltered = all;

  if (selectedSub) {
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => f.categories?.some((c) => c.id === selectedSub));
  } else if (selectedMain) {
    const allowed = new Set(categoryFilterIds);
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => f.categories?.some((c) => allowed.has(c.id)));
  }

  if (selectedDistrict) {
    const districtName = matchedDistrict?.name_cs.toLowerCase() || "";
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => {
      if (f.district_id === selectedDistrict) return true;
      if (districtName && f.locations?.some((loc) => loc.toLowerCase().includes(districtName))) return true;
      return false;
    });
  } else if (effectiveRegion) {
    const regionObj = regions.find((r) => r.id === effectiveRegion);
    const regionName = regionObj?.name_cs.toLowerCase() || "";
    const districtIdsInRegion = new Set(districts.filter((d) => d.region_id === effectiveRegion).map((d) => d.id));
    const districtNamesInRegion = districts
      .filter((d) => d.region_id === effectiveRegion)
      .map((d) => d.name_cs.toLowerCase());
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => {
      if (f.region_id === effectiveRegion) return true;
      if (f.district_id && districtIdsInRegion.has(f.district_id)) return true;
      if (!f.locations) return false;
      return f.locations.some((loc) => {
        const l = loc.toLowerCase();
        if (regionName && l.includes(regionName)) return true;
        return districtNamesInRegion.some((dn) => l.includes(dn));
      });
    });
  }

  if (verifiedOnly) {
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => f.is_verified);
  }

  if (searchText) {
    const q = searchText.toLowerCase();
    realAndSeedFiltered = realAndSeedFiltered.filter((f) => {
      if (f.full_name.toLowerCase().includes(q)) return true;
      if (f.locations?.some((loc) => loc.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  // --- GHOST QUERY ---
  // Ghosti nikdy nejsou ověření, takže verifiedOnly=true je celý ghost segment vynulovaný.
  // Search → server-side ILIKE na name + legal_address->>city (oba s GIN trgm indexem
  // z migrace 20260504110000_ghost_search_trgm.sql). Pod 3 znaky trgm není selektivní
  // → segment přeskočíme aby se vyhnulo full-scan.
  const ghostSearchActive = searchText.length >= 3;
  // onIosApp → ghost (ARES) profily se v aplikaci nikdy nedotahují (App Store).
  const ghostsDisabled = onIosApp || verifiedOnly || (!!searchText && !ghostSearchActive);
  // Sanitize: v `.or()` raw stringu jsou čárky/závorky řídicí znaky → nahradit mezerou.
  const ghostSearchTerm = ghostSearchActive ? searchText.replace(/[,(){}*]/g, " ").trim() : "";
  const ghostSearchOr = ghostSearchTerm
    ? `name.ilike.*${ghostSearchTerm}*,legal_address->>city.ilike.*${ghostSearchTerm}*`
    : "";
  let ghostCount = 0;
  let ghostSlice: Fachman[] = [];

  if (!ghostsDisabled) {
    // `estimated` (pg_class.reltuples + filter selectivity) místo `exact` —
    // `exact` na 290k řádcích občas spadne na statement_timeout a vrátí null.
    // Estimate je ~1% off ale stabilní; pro pagination UX postačuje.
    let q = supabase
      .from("ghost_subjects")
      .select("ico", { count: "estimated", head: true })
      .is("claimed_at", null)
      .eq("is_active", true)
      .eq("gdpr_suppressed", false);
    if (effectiveRegion) q = q.eq("region_id", effectiveRegion);
    if (selectedDistrict) q = q.eq("district_id", selectedDistrict);
    if (selectedSub) q = q.contains("category_ids", [selectedSub]);
    else if (categoryFilterIds.length > 0) q = q.overlaps("category_ids", categoryFilterIds);
    if (ghostSearchOr) q = q.or(ghostSearchOr);
    const { count } = await q;
    ghostCount = count || 0;
  }

  // --- TOTAL + PAGE ---
  const realCount = realAndSeedFiltered.length;
  const totalCount = realCount + ghostCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = clampPage(sp.page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;

  const realSlice = realAndSeedFiltered.slice(
    Math.min(pageStart, realCount),
    Math.min(pageEnd, realCount),
  );

  // --- GHOST SLICE pro tuto stránku ---
  if (!ghostsDisabled && pageEnd > realCount) {
    const ghostCombinedStart = Math.max(pageStart, realCount);
    const ghostOffset = ghostCombinedStart - realCount;
    const ghostLimit = pageEnd - ghostCombinedStart;

    let q = supabase
      .from("ghost_subjects")
      .select("ico, name, legal_form, category_ids, region_id, district_id, legal_address, datum_vzniku")
      .is("claimed_at", null)
      .eq("is_active", true)
      .eq("gdpr_suppressed", false);
    if (effectiveRegion) q = q.eq("region_id", effectiveRegion);
    if (selectedDistrict) q = q.eq("district_id", selectedDistrict);
    if (selectedSub) q = q.contains("category_ids", [selectedSub]);
    else if (categoryFilterIds.length > 0) q = q.overlaps("category_ids", categoryFilterIds);
    if (ghostSearchOr) q = q.or(ghostSearchOr);
    // Sort přes PK ico (nikdy ne přes name — full sort 290k by překročil PostgREST timeout).
    const { data } = await q
      .order("ico", { ascending: true })
      .range(ghostOffset, ghostOffset + ghostLimit - 1);
    const rows = ((data ?? []) as unknown) as Array<{
      ico: string;
      name: string;
      legal_form: string | null;
      category_ids: string[];
      region_id: string | null;
      district_id: string | null;
      legal_address: { city?: string } | null;
      datum_vzniku: string | null;
    }>;

    ghostSlice = rows.map((g) => {
      const ghostCategories = (g.category_ids || [])
        .map((catId) => categories.find((c) => c.id === catId))
        .filter(Boolean) as { id: string; name: string; icon: string }[];
      const city = g.legal_address?.city ?? null;
      return {
        id: `ghost_${g.ico}`,
        full_name: g.name,
        avatar_url: null,
        is_verified: false,
        bank_verified: false,
        subscription_type: "free",
        bio: g.legal_form ?? null,
        hourly_rate: null,
        locations: city ? [city] : null,
        region_id: g.region_id,
        district_id: g.district_id,
        categories: ghostCategories,
        rating: 0,
        review_count: 0,
        is_seed: false,
        is_ghost: true,
        ghost_ico: g.ico,
        has_promo: false,
        promo_type: null,
      };
    });
  }

  const itemsToShow = [...realSlice, ...ghostSlice];

  // Helper: build href pro paginaci s zachováním všech filtrů
  function buildPageHref(page: number): string {
    const params = new URLSearchParams();
    if (kategorieParam) params.set("kategorie", kategorieParam);
    if (krajParam) params.set("kraj", krajParam);
    if (okresParam) params.set("okres", okresParam);
    if (verifiedOnly) params.set("overeni", "1");
    if (searchText) params.set("q", searchText);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/fachmani?${qs}` : "/fachmani";
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full opacity-30 animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-200/30 rounded-full opacity-30 animate-float animation-delay-200"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center">
            <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
              OVĚŘENÍ PROFESIONÁLOVÉ
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Najděte svého fachmana
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {totalCount.toLocaleString("cs-CZ")} profesionálů připravených vám pomoct
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <FachmaniFilters
            categories={categories}
            regions={regions}
            districts={districts}
            selectedMain={selectedMain}
            selectedSub={selectedSub}
            selectedRegion={effectiveRegion}
            selectedDistrict={selectedDistrict}
            verifiedOnly={verifiedOnly}
            searchText={searchText}
          />

          {/* Počet výsledků */}
          <p className="text-gray-500 mb-6">
            {totalCount.toLocaleString("cs-CZ")} {totalCount === 1 ? "fachman" : totalCount < 5 ? "fachmani" : "fachmanů"}
            {searchText && searchText.length < 3 && (
              <span className="text-xs text-gray-400 ml-2">
                (zadejte 3+ znaků pro lepší výsledky)
              </span>
            )}
          </p>

          {/* Seznam */}
          {itemsToShow.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400">{Icons.users}</span>
              </div>
              <p className="text-gray-600 text-lg">Žádní fachmani neodpovídají vašim filtrům.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itemsToShow.map((fachman) => {
                const isPremium = fachman.subscription_type === "premium" || fachman.subscription_type === "business";
                const isTopProfile = fachman.has_promo && fachman.promo_type === "top_profile";

                const backParam = `?from=${encodeURIComponent(buildPageHref(currentPage))}`;
                return (
                  <Link
                    key={fachman.id}
                    href={fachman.is_ghost && fachman.ghost_ico
                      ? `/fachman/ghost/${fachman.ghost_ico}${backParam}`
                      : `/fachman/${fachman.id}${backParam}`}
                    className={`group relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                      isTopProfile ? "ring-2 ring-yellow-400/50 bg-yellow-50/30" :
                      isPremium ? "ring-2 ring-cyan-500/50" : ""
                    }`}
                  >
                    {/* Badges */}
                    <div className="absolute -top-3 left-6 flex gap-2">
                      {isTopProfile && (
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                          🚀 Top
                        </span>
                      )}
                      {isPremium && !isTopProfile && (
                        <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                          Premium
                        </span>
                      )}
                      {!fachman.is_ghost && !fachman.is_verified && (
                        <span className="bg-orange-50 text-orange-600 text-xs px-3 py-1 rounded-full font-semibold border border-orange-200" title="Profil zatím není ověřen">
                          Neověřeno
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-4 mb-4 mt-2">
                      {fachman.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fachman.avatar_url}
                          alt={fachman.full_name}
                          className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-2xl text-white font-bold">
                            {fachman.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-gray-900 truncate">{fachman.full_name}</h2>
                          {fachman.is_verified && (
                            <span className="text-emerald-500" title="Ověřený">
                              {Icons.check}
                            </span>
                          )}
                          {fachman.bank_verified && (
                            <span
                              className="text-blue-500 text-sm"
                              title="Reálný bankovní účet ověřen 1 Kč platbou"
                            >
                              💳
                            </span>
                          )}
                        </div>

                        {fachman.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">{Icons.star}</span>
                            <span className="font-semibold text-gray-900">{fachman.rating}</span>
                            <span className="text-sm text-gray-500">({fachman.review_count})</span>
                          </div>
                        )}

                        {fachman.hourly_rate && (
                          <p className="text-sm text-gray-600 mt-1">
                            od <span className="font-semibold text-gray-900">{fachman.hourly_rate} Kč</span>/hod
                          </p>
                        )}
                      </div>
                    </div>

                    {fachman.bio && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{fachman.bio}</p>
                    )}

                    {fachman.categories && fachman.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fachman.categories.slice(0, 3).map((cat, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                            <CategoryIcon icon={cat.icon} size={12} />{cat.name}
                          </span>
                        ))}
                        {fachman.categories.length > 3 && (
                          <span className="text-xs text-gray-400 px-2 py-1">+{fachman.categories.length - 3}</span>
                        )}
                      </div>
                    )}

                    {fachman.locations && fachman.locations.length > 0 && (
                      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                        <span className="text-cyan-500">{Icons.location}</span>
                        {fachman.locations.slice(0, 2).join(", ")}
                      </p>
                    )}

                    <div className={`w-full text-center py-3 rounded-xl font-semibold group-hover:shadow-lg transition-all ${
                      fachman.is_ghost
                        ? "bg-gray-100 text-gray-700 border border-gray-200"
                        : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
                    }`}>
                      {fachman.is_ghost ? "Detail subjektu" : "Zobrazit profil"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <PaginationLinks
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildPageHref}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500"></div>
            <div className="absolute inset-0 bg-black/10"></div>

            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Nechcete hledat?</h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Zadejte poptávku a nechte fachmany, ať se ozvou vám. Je to rychlejší a jednodušší.
              </p>
              <Link
                href="/nova-poptavka"
                className="inline-flex items-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
              >
                Zadat poptávku
                {Icons.arrowRight}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
