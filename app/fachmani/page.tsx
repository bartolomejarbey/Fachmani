import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import PaginationLinks from "@/app/components/PaginationLinks";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://fachmani.org";
const ITEMS_PER_PAGE = 12;

type Category = { id: string; name: string; icon: string; slug: string | null; parent_id: string | null };

type FachmanCard = {
  key: string;
  slug: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_type: string;
  bio: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  categories: { id: string; name: string; icon: string }[];
  rating: number;
  review_count: number;
  is_seed: boolean;
  has_promo: boolean;
  promo_type: string | null;
};

type SearchParamsInput = Promise<{
  kategorie?: string;
  lokalita?: string;
  overeni?: string;
  strana?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilter = !!(sp.kategorie || sp.lokalita || sp.overeni);
  const title = hasFilter
    ? "Filtrovaní fachmani | Fachmani"
    : "Ověření fachmani | Fachmani — Najdi ověřeného fachmana";
  const description = hasFilter
    ? "Ověření řemeslníci a profesionálové odpovídající vašim filtrům."
    : "Najděte ověřené řemeslníky a profesionály ve vašem okolí. Prohlédněte si hodnocení a portfolio.";

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/fachmani` },
    robots: hasFilter ? { index: false, follow: true } : undefined,
  };
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default async function SeznamFachmanu({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}) {
  const sp = await searchParams;
  const selectedCategoryId = sp.kategorie?.trim() || "";
  const locationFilter = (sp.lokalita || "").trim();
  const verifiedOnly = sp.overeni === "1";
  const currentPage = Math.max(1, parseInt(sp.strana || "1", 10) || 1);

  const supabase = await createSupabaseServer();

  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id, name, icon, slug, parent_id, sort_order")
    .order("sort_order", { ascending: true });
  const categories = (categoriesRaw as Category[] | null) || [];
  const mainCategories = categories.filter((c) => c.parent_id === null);
  const subsByMain = new Map<string, Category[]>();
  categories
    .filter((c) => c.parent_id !== null)
    .forEach((c) => {
      const arr = subsByMain.get(c.parent_id!) || [];
      arr.push(c);
      subsByMain.set(c.parent_id!, arr);
    });

  // Pokud je zvolena hlavní kategorie, zahrneme i její subkategorie do filtrování.
  let activeCategoryIds: string[] = [];
  if (selectedCategoryId) {
    const selected = categories.find((c) => c.id === selectedCategoryId);
    if (selected) {
      activeCategoryIds =
        selected.parent_id === null
          ? [selected.id, ...(subsByMain.get(selected.id) || []).map((s) => s.id)]
          : [selected.id];
    }
  }

  const all: FachmanCard[] = [];

  // Reální fachmani
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_verified, subscription_type, slug")
    .eq("role", "provider");

  if (profilesData && profilesData.length > 0) {
    const providerIds = profilesData.map((p) => p.id);

    const [{ data: providerProfilesData }, { data: providerCategoriesData }, { data: reviewsData }, { data: promosData }] =
      await Promise.all([
        supabase
          .from("provider_profiles")
          .select("id, user_id, bio, hourly_rate, locations")
          .in("user_id", providerIds),
        supabase.from("provider_categories").select("provider_id, category_id"),
        supabase.from("reviews").select("provider_id, rating").in("provider_id", providerIds),
        supabase
          .from("promotions")
          .select("provider_id, type")
          .eq("status", "active")
          .gte("ends_at", new Date().toISOString()),
      ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));

    for (const profile of profilesData) {
      const providerProfile = providerProfilesData?.find((pp) => pp.user_id === profile.id);
      const provCats =
        (providerCategoriesData?.filter((pc) => pc.provider_id === providerProfile?.id) || [])
          .map((pc) => catMap.get(pc.category_id))
          .filter((c): c is Category => !!c);
      const revs = reviewsData?.filter((r) => r.provider_id === profile.id) || [];
      const promo = promosData?.find((p) => p.provider_id === profile.id);

      const avgRating =
        revs.length > 0 ? Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10 : 0;

      all.push({
        key: profile.id,
        slug: profile.slug || profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        is_verified: !!profile.is_verified,
        subscription_type: profile.subscription_type || "free",
        bio: providerProfile?.bio || null,
        hourly_rate: providerProfile?.hourly_rate ?? null,
        locations: providerProfile?.locations || null,
        categories: provCats.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
        rating: avgRating,
        review_count: revs.length,
        is_seed: false,
        has_promo: !!promo,
        promo_type: promo?.type || null,
      });
    }
  }

  // Seed fachmani
  const { data: seedData } = await supabase
    .from("seed_providers")
    .select("id, full_name, avatar_url, is_verified, bio, hourly_rate, locations, category_ids, rating, review_count, slug")
    .eq("is_active", true);

  if (seedData) {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    for (const seed of seedData) {
      const cats: { id: string; name: string; icon: string }[] = [];
      for (const catId of (seed.category_ids as string[] | null) || []) {
        const c = catMap.get(catId);
        if (c) cats.push({ id: c.id, name: c.name, icon: c.icon });
      }
      all.push({
        key: `seed_${seed.id}`,
        slug: seed.slug || `seed-${seed.id}`,
        full_name: seed.full_name,
        avatar_url: seed.avatar_url || null,
        is_verified: !!seed.is_verified,
        subscription_type: "premium",
        bio: seed.bio,
        hourly_rate: seed.hourly_rate,
        locations: seed.locations,
        categories: cats,
        rating: seed.rating || 0,
        review_count: seed.review_count || 0,
        is_seed: true,
        has_promo: true,
        promo_type: "top_profile",
      });
    }
  }

  // Filtrování
  let filtered = all;
  if (activeCategoryIds.length > 0) {
    const set = new Set(activeCategoryIds);
    filtered = filtered.filter((f) => f.categories.some((c) => set.has(c.id)));
  }
  if (locationFilter) {
    const q = locationFilter.toLowerCase();
    filtered = filtered.filter((f) => f.locations?.some((l) => l.toLowerCase().includes(q)));
  }
  if (verifiedOnly) {
    filtered = filtered.filter((f) => f.is_verified);
  }

  // Řazení
  filtered.sort((a, b) => {
    if (a.has_promo !== b.has_promo) return a.has_promo ? -1 : 1;
    const subOrder: Record<string, number> = { business: 3, premium: 2, free: 1 };
    const diff = (subOrder[b.subscription_type] || 0) - (subOrder[a.subscription_type] || 0);
    if (diff !== 0) return diff;
    if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
    return b.rating - a.rating;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * ITEMS_PER_PAGE, clampedPage * ITEMS_PER_PAGE);
  const verifiedCount = all.filter((f) => f.is_verified).length;

  const hrefForPage = (page: number) =>
    `/fachmani${buildQueryString({
      kategorie: selectedCategoryId || undefined,
      lokalita: locationFilter || undefined,
      overeni: verifiedOnly ? "1" : undefined,
      strana: page > 1 ? page : undefined,
    })}`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: pageItems.length,
    itemListElement: pageItems.map((f, idx) => ({
      "@type": "ListItem",
      position: (clampedPage - 1) * ITEMS_PER_PAGE + idx + 1,
      url: `${SITE_URL}/fachmani/${f.slug}`,
      name: f.full_name,
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
            OVĚŘENÍ PROFESIONÁLOVÉ
          </span>
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">Najděte svého fachmana</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {verifiedCount} ověřených profesionálů připravených vám pomoct
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <form
            method="get"
            action="/fachmani"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8"
          >
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="kategorie">
                  Kategorie
                </label>
                <select
                  id="kategorie"
                  name="kategorie"
                  defaultValue={selectedCategoryId}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Všechny kategorie</option>
                  {mainCategories.map((main) => (
                    <optgroup key={main.id} label={`${main.icon} ${main.name}`}>
                      <option value={main.id}>{main.icon} {main.name} — vše</option>
                      {(subsByMain.get(main.id) || []).map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          — {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="lokalita">
                  Lokalita
                </label>
                <input
                  id="lokalita"
                  name="lokalita"
                  type="text"
                  defaultValue={locationFilter}
                  placeholder="Např. Praha, Brno..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors w-full">
                  <input
                    type="checkbox"
                    name="overeni"
                    value="1"
                    defaultChecked={verifiedOnly}
                    className="w-5 h-5 text-emerald-600 rounded-lg border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700 font-medium">Pouze ověření</span>
                </label>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-semibold"
                >
                  Filtrovat
                </button>
                <Link
                  href="/fachmani"
                  className="px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Zrušit
                </Link>
              </div>
            </div>
          </form>

          <p className="text-gray-500 mb-6">
            {filtered.length} {filtered.length === 1 ? "fachman" : filtered.length < 5 ? "fachmani" : "fachmanů"}
          </p>

          {pageItems.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center">
              <p className="text-gray-600 text-lg">
                {all.length === 0
                  ? "Zatím nejsou žádní registrovaní fachmani."
                  : "Žádní fachmani neodpovídají vašim filtrům."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((fachman) => {
                const isPremium =
                  fachman.subscription_type === "premium" || fachman.subscription_type === "business";
                const isTopProfile = fachman.has_promo && fachman.promo_type === "top_profile";

                return (
                  <Link
                    key={fachman.key}
                    href={`/fachmani/${fachman.slug}`}
                    className={`group relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                      isTopProfile ? "ring-2 ring-yellow-400/50 bg-yellow-50/30" : isPremium ? "ring-2 ring-cyan-500/50" : ""
                    }`}
                  >
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
                    </div>

                    <div className="flex items-start gap-4 mb-4 mt-2">
                      {fachman.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fachman.avatar_url}
                          alt={fachman.full_name}
                          className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 group-hover:scale-110 transition-transform"
                          loading="lazy"
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
                              ✓
                            </span>
                          )}
                        </div>

                        {fachman.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">★</span>
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

                    {fachman.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fachman.categories.slice(0, 3).map((cat) => (
                          <span key={cat.id} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                            {cat.icon} {cat.name}
                          </span>
                        ))}
                        {fachman.categories.length > 3 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{fachman.categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {fachman.locations && fachman.locations.length > 0 && (
                      <p className="text-xs text-gray-500 mb-4">📍 {fachman.locations.slice(0, 2).join(", ")}</p>
                    )}

                    <div className="w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold group-hover:shadow-lg transition-all">
                      Zobrazit profil
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <PaginationLinks currentPage={clampedPage} totalPages={totalPages} hrefForPage={hrefForPage} />
        </div>
      </section>

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
                Zadat poptávku →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    </div>
  );
}
