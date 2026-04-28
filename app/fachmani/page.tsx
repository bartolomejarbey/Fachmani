"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import Pagination from "@/app/components/Pagination";

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  sort_order: number | null;
};

type Region = {
  id: string;
  code: string;
  name_cs: string;
  sort_order: number | null;
};

type District = {
  id: string;
  code: string;
  name_cs: string;
  region_id: string;
  sort_order: number | null;
};

type Fachman = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_type: string;
  bio: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  region_id: string | null;
  district_id: string | null;
  categories: { id: string; name: string; icon: string }[];
  rating: number;
  review_count: number;
  is_seed: boolean; // fiktivní nebo reálný
  is_ghost?: boolean; // importovaný z ARES, ještě neclaimnut
  ghost_ico?: string;
  has_promo: boolean; // má aktivní promo
  promo_type: string | null;
};

function SeznamFachmanuContent() {
  const searchParams = useSearchParams();
  const [fachmani, setFachmani] = useState<Fachman[]>([]);
  const [filteredFachmani, setFilteredFachmani] = useState<Fachman[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [selectedMain, setSelectedMain] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Read category from URL param — match against all categories (main or sub)
  useEffect(() => {
    const kategorie = searchParams.get("kategorie");
    if (kategorie && categories.length > 0) {
      const match = categories.find(c => c.id === kategorie);
      if (!match) return;
      if (match.parent_id === null) {
        setSelectedMain(match.id);
        setSelectedCategory("");
      } else {
        setSelectedMain(match.parent_id);
        setSelectedCategory(match.id);
      }
    }
  }, [searchParams, categories]);

  // Read kraj/okres from URL params (code or id)
  useEffect(() => {
    const kraj = searchParams.get("kraj");
    if (kraj && regions.length > 0) {
      const match = regions.find(r => r.id === kraj || r.code === kraj);
      if (match) setSelectedRegion(match.id);
    }
  }, [searchParams, regions]);
  useEffect(() => {
    const okres = searchParams.get("okres");
    if (okres && districts.length > 0) {
      const match = districts.find(d => d.id === okres || d.code === okres);
      if (match) {
        setSelectedDistrict(match.id);
        setSelectedRegion(match.region_id);
      }
    }
  }, [searchParams, districts]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    // Načteme kategorie (pouze aktivní)
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, icon, parent_id, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name");

    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Načteme kraje + okresy
    const [{ data: regionsData }, { data: districtsData }] = await Promise.all([
      supabase.from("regions").select("id, code, name_cs, sort_order").order("sort_order", { ascending: true, nullsFirst: false }).order("name_cs"),
      supabase.from("districts").select("id, code, name_cs, region_id, sort_order").order("sort_order", { ascending: true, nullsFirst: false }).order("name_cs"),
    ]);
    if (regionsData) setRegions(regionsData);
    if (districtsData) setDistricts(districtsData);

    const allFachmani: Fachman[] = [];

    // === 1. Načteme REÁLNÉ fachmany ===
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, subscription_type, region_id, district_id, created_at")
      .eq("role", "provider")
      .order("subscription_type", { ascending: false });

    if (profilesData && profilesData.length > 0) {
      const providerIds = profilesData.map(p => p.id);

      // Provider profiles
      const { data: providerProfilesData } = await supabase
        .from("provider_profiles")
        .select("id, user_id, bio, hourly_rate, locations")
        .in("user_id", providerIds);

      // Provider categories
      const { data: providerCategoriesData } = await supabase
        .from("provider_categories")
        .select("provider_id, categories(id, name, icon)");

      // Reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("provider_id, rating")
        .in("provider_id", providerIds);

      // Aktivní promo
      const { data: promosData } = await supabase
        .from("promotions")
        .select("provider_id, type")
        .eq("status", "active")
        .gte("ends_at", new Date().toISOString());

      // Spojíme data
      profilesData.forEach(profile => {
        const providerProfile = providerProfilesData?.find(pp => pp.user_id === profile.id);
        const cats = providerCategoriesData?.filter((pc: { provider_id: string }) => pc.provider_id === providerProfile?.id) || [];
        const revs = reviewsData?.filter(r => r.provider_id === profile.id) || [];
        const promo = promosData?.find(p => p.provider_id === profile.id);

        const avgRating = revs.length > 0
          ? Math.round((revs.reduce((sum, r) => sum + r.rating, 0) / revs.length) * 10) / 10
          : 0;

        allFachmani.push({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url || null,
          is_verified: profile.is_verified,
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

    // === 2. Načteme FIKTIVNÍ fachmany ===
    const { data: seedData } = await supabase
      .from("seed_providers")
      .select("*")
      .eq("is_active", true);

    if (seedData) {
      seedData.forEach(seed => {
        // Mapujeme category_ids na objekty
        const seedCategories = seed.category_ids
          ?.map((catId: string) => categoriesData?.find(c => c.id === catId))
          .filter(Boolean) || [];

        allFachmani.push({
          id: `seed_${seed.id}`,
          full_name: seed.full_name,
          avatar_url: seed.avatar_url || null,
          is_verified: seed.is_verified,
          subscription_type: "premium", // Fiktivní jsou vždy premium
          bio: seed.bio,
          hourly_rate: seed.hourly_rate,
          locations: seed.locations,
          region_id: null,
          district_id: null,
          categories: seedCategories,
          rating: seed.rating || 0,
          review_count: seed.review_count || 0,
          is_seed: true,
          has_promo: true, // Fiktivní mají vždy "promo"
          promo_type: "top_profile",
        });
      });
    }

    // === 3. Načteme GHOST fachmany (z ARES, ještě neclaimnutí) ===
    const { data: ghostData } = await supabase
      .from("ghost_subjects")
      .select("ico, name, legal_form, category_ids, region_id, district_id, legal_address, datum_vzniku")
      .is("claimed_at", null)
      .eq("is_active", true)
      .limit(500); // safety cap; bulk je obrovský

    if (ghostData && ghostData.length > 0) {
      ghostData.forEach((g: {
        ico: string;
        name: string;
        legal_form: string | null;
        category_ids: string[];
        region_id: string | null;
        district_id: string | null;
        legal_address: { city?: string } | null;
        datum_vzniku: string | null;
      }) => {
        const ghostCategories = (g.category_ids || [])
          .map((catId) => categoriesData?.find((c) => c.id === catId))
          .filter(Boolean) as { id: string; name: string; icon: string }[];

        const city = g.legal_address?.city ?? null;

        allFachmani.push({
          id: `ghost_${g.ico}`,
          full_name: g.name,
          avatar_url: null,
          is_verified: false,
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
        });
      });
    }

    // === 4. Seřadíme ===
    // Pořadí: promo/topovaní > premium/business > verified > ostatní > ghost (nakonec) > podle ratingu
    allFachmani.sort((a, b) => {
      // Ghost subjekty vždy na konec
      if (a.is_ghost && !b.is_ghost) return 1;
      if (!a.is_ghost && b.is_ghost) return -1;

      // Promo nahoře
      if (a.has_promo && !b.has_promo) return -1;
      if (!a.has_promo && b.has_promo) return 1;

      // Premium/Business
      const subOrder: Record<string, number> = { business: 3, premium: 2, free: 1 };
      const subDiff = (subOrder[b.subscription_type] || 0) - (subOrder[a.subscription_type] || 0);
      if (subDiff !== 0) return subDiff;

      // Verified
      if (a.is_verified && !b.is_verified) return -1;
      if (!a.is_verified && b.is_verified) return 1;

      // Rating
      return b.rating - a.rating;
    });

    setFachmani(allFachmani);
    setFilteredFachmani(allFachmani);
    setLoading(false);
  };

  const mainCategories = categories.filter(c => c.parent_id === null);
  const subCategories = categories.filter(c => c.parent_id !== null);
  const subsOfSelectedMain = selectedMain
    ? subCategories.filter(c => c.parent_id === selectedMain)
    : [];

  useEffect(() => {
    let result = [...fachmani];

    if (selectedCategory) {
      result = result.filter(f =>
        f.categories?.some(c => c.id === selectedCategory)
      );
    } else if (selectedMain) {
      const allowedIds = new Set<string>([
        selectedMain,
        ...subCategories.filter(c => c.parent_id === selectedMain).map(c => c.id),
      ]);
      result = result.filter(f =>
        f.categories?.some(c => allowedIds.has(c.id))
      );
    }

    // Lokalita: pro reálné fachmany (region_id/district_id) + fallback textový match na locations[] pro seedy
    if (selectedDistrict) {
      const districtObj = districts.find(d => d.id === selectedDistrict);
      const districtName = districtObj?.name_cs.toLowerCase() || "";
      result = result.filter(f => {
        if (f.district_id === selectedDistrict) return true;
        if (districtName && f.locations?.some(loc => loc.toLowerCase().includes(districtName))) return true;
        return false;
      });
    } else if (selectedRegion) {
      const regionObj = regions.find(r => r.id === selectedRegion);
      const regionName = regionObj?.name_cs.toLowerCase() || "";
      const districtIdsInRegion = new Set(districts.filter(d => d.region_id === selectedRegion).map(d => d.id));
      const districtNamesInRegion = districts
        .filter(d => d.region_id === selectedRegion)
        .map(d => d.name_cs.toLowerCase());
      result = result.filter(f => {
        if (f.region_id === selectedRegion) return true;
        if (f.district_id && districtIdsInRegion.has(f.district_id)) return true;
        if (!f.locations) return false;
        return f.locations.some(loc => {
          const l = loc.toLowerCase();
          if (regionName && l.includes(regionName)) return true;
          return districtNamesInRegion.some(dn => l.includes(dn));
        });
      });
    }

    if (verifiedOnly) {
      result = result.filter(f => f.is_verified);
    }

    setFilteredFachmani(result);
    setCurrentPage(1);
  }, [fachmani, selectedMain, selectedCategory, selectedRegion, selectedDistrict, verifiedOnly, categories, regions, districts]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full opacity-30 animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-200/30 rounded-full opacity-30 animate-float animation-delay-200"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
              OVĚŘENÍ PROFESIONÁLOVÉ
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Najděte svého fachmana
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {fachmani.filter(f => f.is_verified).length} ověřených profesionálů připravených vám pomoct
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Filtry */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hlavní kategorie
                </label>
                <select
                  value={selectedMain}
                  onChange={(e) => {
                    setSelectedMain(e.target.value);
                    setSelectedCategory("");
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Všechny kategorie</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Podkategorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={!selectedMain || subsOfSelectedMain.length === 0}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Všechny podkategorie</option>
                  {subsOfSelectedMain.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kraj
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedDistrict("");
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Všechny kraje</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name_cs}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Okres
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedRegion}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Všechny okresy</option>
                  {districts
                    .filter((d) => d.region_id === selectedRegion)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name_cs}</option>
                    ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors w-full">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded-lg border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700 font-medium">Pouze ověření</span>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedMain("");
                    setSelectedCategory("");
                    setSelectedRegion("");
                    setSelectedDistrict("");
                    setVerifiedOnly(false);
                  }}
                  className="w-full px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Zrušit filtry
                </button>
              </div>
            </div>
          </div>

          {/* Počet výsledků */}
          <p className="text-gray-500 mb-6">
            {filteredFachmani.length} {filteredFachmani.length === 1 ? "fachman" : filteredFachmani.length < 5 ? "fachmani" : "fachmanů"}
          </p>

          {/* Seznam */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-100 rounded-3xl h-72 animate-pulse"></div>
              ))}
            </div>
          ) : filteredFachmani.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400">{Icons.users}</span>
              </div>
              <p className="text-gray-600 text-lg">
                {fachmani.length === 0
                  ? "Zatím nejsou žádní registrovaní fachmani."
                  : "Žádní fachmani neodpovídají vašim filtrům."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFachmani.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((fachman, i) => {
                const isPremium = fachman.subscription_type === "premium" || fachman.subscription_type === "business";
                const isTopProfile = fachman.has_promo && fachman.promo_type === "top_profile";

                return (
                  <Link
                    key={fachman.id}
                    href={fachman.is_ghost && fachman.ghost_ico
                      ? `/fachman/ghost/${fachman.ghost_ico}`
                      : `/fachman/${fachman.id}`}
                    className={`group relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                      fachman.is_ghost ? "opacity-90" :
                      isTopProfile ? "ring-2 ring-yellow-400/50 bg-yellow-50/30" :
                      isPremium ? "ring-2 ring-cyan-500/50" : ""
                    } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Badges */}
                    <div className="absolute -top-3 left-6 flex gap-2">
                      {isTopProfile && (
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                          🚀 Top
                        </span>
                      )}
                      {isPremium && !isTopProfile && !fachman.is_ghost && (
                        <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                          Premium
                        </span>
                      )}
                      {fachman.is_ghost && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-semibold border border-gray-200" title="Subjekt importovaný z ARES, profil zatím nepřevzal">
                          Neověřeno (ARES)
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-4 mb-4 mt-2">
                      {fachman.avatar_url ? (
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
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {fachman.bio}
                      </p>
                    )}

                    {fachman.categories && fachman.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fachman.categories.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full"
                          >
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

          {filteredFachmani.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredFachmani.length / ITEMS_PER_PAGE)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500"></div>
            <div className="absolute inset-0 bg-black/10"></div>

            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Nechcete hledat?
              </h2>
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

export default function SeznamFachmanu() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <SeznamFachmanuContent />
    </Suspense>
  );
}