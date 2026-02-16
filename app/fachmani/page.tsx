"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Fachman = {
  id: string;
  full_name: string;
  is_verified: boolean;
  subscription_type: string;
  created_at: string;
  provider_profiles: {
    bio: string | null;
    hourly_rate: number | null;
    locations: string[] | null;
  } | null;
  provider_categories: {
    categories: Category;
  }[];
  reviews: {
    rating: number;
  }[];
};

export default function SeznamFachmanu() {
  const [fachmani, setFachmani] = useState<Fachman[]>([]);
  const [filteredFachmani, setFilteredFachmani] = useState<Fachman[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Načteme providery
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, is_verified, subscription_type, created_at")
        .eq("role", "provider")
        .order("subscription_type", { ascending: false });

      if (profilesData && profilesData.length > 0) {
        const providerIds = profilesData.map(p => p.id);
        
        // Načteme provider_profiles
        const { data: providerProfilesData } = await supabase
          .from("provider_profiles")
          .select("user_id, bio, hourly_rate, locations")
          .in("user_id", providerIds);

        // Načteme provider_categories
        const ppIds = providerProfilesData?.map(pp => pp.user_id) || [];
        let providerCategoriesData: any[] = [];
        if (ppIds.length > 0) {
          const { data } = await supabase
            .from("provider_categories")
            .select("provider_id, categories(id, name, icon)");
          providerCategoriesData = data || [];
        }

        // Načteme reviews
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("provider_id, rating")
          .in("provider_id", providerIds);

        // Spojíme data
        const fachmaniWithData = profilesData.map(profile => {
          const providerProfile = providerProfilesData?.find(pp => pp.user_id === profile.id);
          const cats = providerCategoriesData?.filter((pc: any) => pc.provider_id === profile.id) || [];
          const revs = reviewsData?.filter(r => r.provider_id === profile.id) || [];

          return {
            ...profile,
            provider_profiles: providerProfile ? {
              bio: providerProfile.bio,
              hourly_rate: providerProfile.hourly_rate,
              locations: providerProfile.locations
            } : null,
            provider_categories: cats,
            reviews: revs
          };
        });

        setFachmani(fachmaniWithData as any);
        setFilteredFachmani(fachmaniWithData as any);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    let result = [...fachmani];

    if (selectedCategory) {
      result = result.filter(f => 
        f.provider_categories?.some((pc: any) => pc.categories?.id === selectedCategory)
      );
    }

    if (locationFilter) {
      result = result.filter(f => 
        f.provider_profiles?.locations?.some(loc => 
          loc.toLowerCase().includes(locationFilter.toLowerCase())
        )
      );
    }

    if (verifiedOnly) {
      result = result.filter(f => f.is_verified);
    }

    setFilteredFachmani(result);
  }, [fachmani, selectedCategory, locationFilter, verifiedOnly]);

  const getAverageRating = (reviews: { rating: number }[]) => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
        
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
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Všechny kategorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokalita
                </label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Např. Praha, Brno..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
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
                    setSelectedCategory("");
                    setLocationFilter("");
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
              {[1,2,3,4,5,6].map(i => (
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
              {filteredFachmani.map((fachman, i) => {
                const rating = getAverageRating(fachman.reviews);
                const isPremium = fachman.subscription_type === "premium" || fachman.subscription_type === "business";
                
                return (
                  <Link
                    key={fachman.id}
                    href={`/fachman/${fachman.id}`}
                    className={`group relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                      isPremium ? "ring-2 ring-cyan-500/50" : ""
                    } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {isPremium && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                          Premium
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-2xl text-white font-bold">
                          {fachman.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-gray-900 truncate">{fachman.full_name}</h2>
                          {fachman.is_verified && (
                            <span className="text-emerald-500" title="Ověřený">
                              {Icons.check}
                            </span>
                          )}
                        </div>

                        {rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">{Icons.star}</span>
                            <span className="font-semibold text-gray-900">{rating}</span>
                            <span className="text-sm text-gray-500">({fachman.reviews.length})</span>
                          </div>
                        )}

                        {fachman.provider_profiles?.hourly_rate && (
                          <p className="text-sm text-gray-600 mt-1">
                            od <span className="font-semibold text-gray-900">{fachman.provider_profiles.hourly_rate} Kč</span>/hod
                          </p>
                        )}
                      </div>
                    </div>

                    {fachman.provider_profiles?.bio && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {fachman.provider_profiles.bio}
                      </p>
                    )}

                    {fachman.provider_categories && fachman.provider_categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {fachman.provider_categories.slice(0, 3).map((pc: any, idx: number) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full"
                          >
                            {pc.categories?.icon} {pc.categories?.name}
                          </span>
                        ))}
                        {fachman.provider_categories.length > 3 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{fachman.provider_categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {fachman.provider_profiles?.locations && fachman.provider_profiles.locations.length > 0 && (
                      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                        <span className="text-cyan-500">{Icons.location}</span>
                        {fachman.provider_profiles.locations.slice(0, 2).join(", ")}
                      </p>
                    )}

                    <div className="w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold group-hover:shadow-lg transition-all">
                      Zobrazit profil
                    </div>
                  </Link>
                );
              })}
            </div>
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