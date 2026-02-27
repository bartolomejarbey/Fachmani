"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  expires_at: string;
};

type Provider = {
  id: string;
  full_name: string;
  is_verified: boolean;
  subscription_type: string;
  bio: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  rating: number;
  review_count: number;
  is_seed: boolean;
  has_promo: boolean;
  promo_type: string | null;
};

const locationOptions = [
  "Všechny lokality",
  "Praha",
  "Brno",
  "Ostrava",
  "Plzeň",
  "Liberec",
  "Olomouc",
  "České Budějovice",
  "Hradec Králové",
  "Pardubice",
  "Zlín",
];

export default function KategorieDetail() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "providers">("requests");
  const [selectedLocation, setSelectedLocation] = useState("Všechny lokality");

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [slug]);

  const loadData = async () => {
    // Načteme kategorii
    const { data: catData } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!catData) {
      setLoading(false);
      return;
    }

    setCategory(catData);

    // === Načteme poptávky v této kategorii ===
    const { data: reqData } = await supabase
      .from("requests")
      .select("*")
      .eq("category_id", catData.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    setRequests(reqData || []);

    // === Načteme fachmany v této kategorii ===
    const allProviders: Provider[] = [];

    // 1. REÁLNÍ fachmani
    const { data: providerCategoriesData } = await supabase
      .from("provider_categories")
      .select("provider_id")
      .eq("category_id", catData.id);

    if (providerCategoriesData && providerCategoriesData.length > 0) {
      const providerIds = providerCategoriesData.map(pc => pc.provider_id);

      // Načteme profily
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, is_verified, subscription_type")
        .in("id", providerIds)
        .eq("role", "provider");

      // Načteme provider_profiles
      const { data: providerProfilesData } = await supabase
        .from("provider_profiles")
        .select("user_id, bio, hourly_rate, locations")
        .in("user_id", providerIds);

      // Načteme recenze
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("provider_id, rating")
        .in("provider_id", providerIds);

      // Načteme aktivní promo
      const { data: promosData } = await supabase
        .from("promotions")
        .select("provider_id, type")
        .eq("status", "active")
        .gte("ends_at", new Date().toISOString())
        .in("provider_id", providerIds);

      profilesData?.forEach(profile => {
        const pp = providerProfilesData?.find(p => p.user_id === profile.id);
        const revs = reviewsData?.filter(r => r.provider_id === profile.id) || [];
        const promo = promosData?.find(p => p.provider_id === profile.id);

        const avgRating = revs.length > 0
          ? Math.round((revs.reduce((sum, r) => sum + r.rating, 0) / revs.length) * 10) / 10
          : 0;

        allProviders.push({
          id: profile.id,
          full_name: profile.full_name,
          is_verified: profile.is_verified,
          subscription_type: profile.subscription_type || "free",
          bio: pp?.bio || null,
          hourly_rate: pp?.hourly_rate || null,
          locations: pp?.locations || null,
          rating: avgRating,
          review_count: revs.length,
          is_seed: false,
          has_promo: !!promo,
          promo_type: promo?.type || null,
        });
      });
    }

    // 2. FIKTIVNÍ fachmani v této kategorii
    const { data: seedData } = await supabase
      .from("seed_providers")
      .select("*")
      .eq("is_active", true)
      .contains("category_ids", [catData.id]);

    seedData?.forEach(seed => {
      allProviders.push({
        id: `seed_${seed.id}`,
        full_name: seed.full_name,
        is_verified: seed.is_verified,
        subscription_type: "premium",
        bio: seed.bio,
        hourly_rate: seed.hourly_rate,
        locations: seed.locations,
        rating: seed.rating || 0,
        review_count: seed.review_count || 0,
        is_seed: true,
        has_promo: true,
        promo_type: "top_profile",
      });
    });

    // Seřadíme: promo > premium > verified > rating
    allProviders.sort((a, b) => {
      if (a.has_promo && !b.has_promo) return -1;
      if (!a.has_promo && b.has_promo) return 1;

      const subOrder: Record<string, number> = { business: 3, premium: 2, free: 1 };
      const subDiff = (subOrder[b.subscription_type] || 0) - (subOrder[a.subscription_type] || 0);
      if (subDiff !== 0) return subDiff;

      if (a.is_verified && !b.is_verified) return -1;
      if (!a.is_verified && b.is_verified) return 1;

      return b.rating - a.rating;
    });

    setProviders(allProviders);
    setLoading(false);
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Filtrování podle lokality
  const filteredRequests = selectedLocation === "Všechny lokality"
    ? requests
    : requests.filter(r => r.location.toLowerCase().includes(selectedLocation.toLowerCase()));

  const filteredProviders = selectedLocation === "Všechny lokality"
    ? providers
    : providers.filter(p => p.locations?.some(loc =>
        loc.toLowerCase().includes(selectedLocation.toLowerCase())
      ));

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Načítám...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kategorie nenalezena</h2>
            <p className="text-gray-600 mb-6">Tato kategorie neexistuje nebo byla odstraněna.</p>
            <Link href="/kategorie" className="text-cyan-600 font-semibold hover:text-cyan-700">
              ← Zpět na všechny kategorie
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-12 bg-white border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <Link
              href="/kategorie"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 mb-6 transition-colors"
            >
              ← Všechny kategorie
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-5xl">
                {category.icon}
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{category.name}</h1>
                <p className="text-gray-600 mt-1 max-w-2xl">
                  {category.description || `Najděte ověřené odborníky v kategorii ${category.name}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Tabs */}
      <section className="bg-white border-b sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "requests"
                    ? "bg-cyan-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                📋 Poptávky ({filteredRequests.length})
              </button>
              <button
                onClick={() => setActiveTab("providers")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "providers"
                    ? "bg-cyan-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                👷 Fachmani ({filteredProviders.length})
              </button>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">📍 Lokalita:</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 bg-gray-100 border-0 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-cyan-500"
              >
                {locationOptions.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <>
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné aktivní poptávky</h3>
                  <p className="text-gray-600 mb-6">
                    V této kategorii {selectedLocation !== "Všechny lokality" && `v lokalitě ${selectedLocation} `}
                    zatím nejsou žádné aktivní poptávky.
                  </p>
                  <Link
                    href="/nova-poptavka"
                    className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Zadat první poptávku
                    {Icons.arrowRight}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRequests.map((request, i) => (
                    <Link
                      key={request.id}
                      href={`/poptavka/${request.id}`}
                      className={`block bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all hover:-translate-y-0.5 border border-gray-100 ${
                        mounted ? 'animate-fade-in-up' : 'opacity-0'
                      }`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{request.title}</h3>
                          <p className="text-gray-600 line-clamp-2 mb-4">{request.description}</p>

                          <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                              📍 {request.location}
                            </span>
                            {(request.budget_min || request.budget_max) && (
                              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                💰 {request.budget_min && `${request.budget_min.toLocaleString()} Kč`}
                                {request.budget_min && request.budget_max && " - "}
                                {request.budget_max && `${request.budget_max.toLocaleString()} Kč`}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                              📅 {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                            </span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            daysLeft(request.expires_at) <= 3
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {daysLeft(request.expires_at) > 0
                              ? `Zbývá ${daysLeft(request.expires_at)} dní`
                              : 'Vypršelo'
                            }
                          </span>
                          <span className="text-cyan-600 font-semibold text-sm">
                            Zobrazit detail →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Providers Tab */}
          {activeTab === "providers" && (
            <>
              {filteredProviders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <div className="text-5xl mb-4">👷</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Žádní fachmani</h3>
                  <p className="text-gray-600 mb-6">
                    V této kategorii {selectedLocation !== "Všechny lokality" && `v lokalitě ${selectedLocation} `}
                    zatím nejsou registrovaní fachmani.
                  </p>
                  <Link
                    href="/auth/register?role=provider"
                    className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Registrovat se jako fachman
                    {Icons.arrowRight}
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProviders.map((provider, i) => {
                    const isPremium = provider.subscription_type === "premium" || provider.subscription_type === "business";
                    const isTopProfile = provider.has_promo && provider.promo_type === "top_profile";

                    return (
                      <Link
                        key={provider.id}
                        href={`/fachman/${provider.id}`}
                        className={`block bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all hover:-translate-y-0.5 border border-gray-100 relative ${
                          isTopProfile ? "ring-2 ring-yellow-400/50 bg-yellow-50/30" :
                          isPremium ? "ring-2 ring-cyan-500/30" : ""
                        } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {/* Badges */}
                        {(isTopProfile || isPremium) && (
                          <div className="absolute -top-2 left-4">
                            {isTopProfile ? (
                              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                🚀 Top
                              </span>
                            ) : (
                              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                ⭐ Premium
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-start gap-4 mt-2">
                          <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                            👷
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 truncate">{provider.full_name}</h3>
                              {provider.is_verified && (
                                <span className="text-emerald-500 flex-shrink-0" title="Ověřený">✓</span>
                              )}
                            </div>

                            {provider.rating > 0 && (
                              <div className="flex items-center gap-1 mb-2">
                                <span className="text-yellow-400">★</span>
                                <span className="font-semibold text-gray-900">{provider.rating}</span>
                                <span className="text-gray-400 text-sm">({provider.review_count})</span>
                              </div>
                            )}

                            {provider.bio && (
                              <p className="text-gray-600 text-sm line-clamp-2 mb-3">{provider.bio}</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {provider.hourly_rate && (
                                <span className="text-sm text-cyan-600 font-semibold">
                                  {provider.hourly_rate} Kč/hod
                                </span>
                              )}
                              {provider.locations && provider.locations.length > 0 && (
                                <span className="text-sm text-gray-500">
                                  📍 {provider.locations.slice(0, 2).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Nenašli jste co hledáte?
          </h2>
          <p className="text-gray-600 mb-6">
            Zadejte poptávku a fachmani se vám ozvou sami.
          </p>
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Zadat poptávku zdarma
            {Icons.arrowRight}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}