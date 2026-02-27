"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  expires_at: string;
  categories: { id: string; name: string; icon: string } | null;
  offers_count?: number;
};

export default function PoptavkyPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    await supabase.rpc('expire_old_requests').catch(() => {});

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, icon")
      .order("name");

    if (categoriesData) setCategories(categoriesData);

    const { data: requestsData } = await supabase
      .from("requests")
      .select("id, title, description, location, budget_min, budget_max, created_at, expires_at, categories:category_id(id, name, icon)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (requestsData) {
      const requestIds = requestsData.map(r => r.id);
      const { data: offersData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      const requestsWithCounts = requestsData.map(r => ({
        ...r,
        offers_count: offersCounts[r.id] || 0,
      }));

      setRequests(requestsWithCounts as any);
      setFilteredRequests(requestsWithCounts as any);
    }

    setLoading(false);
  };

  useEffect(() => {
    let result = [...requests];

    if (selectedCategory) {
      result = result.filter(r => r.categories?.id === selectedCategory);
    }

    if (locationFilter) {
      result = result.filter(r => 
        r.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "expiring") {
      result.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
    } else if (sortBy === "budget") {
      result.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0));
    }

    setFilteredRequests(result);
  }, [requests, selectedCategory, locationFilter, sortBy]);

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `před ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `před ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `před ${diffDays}d`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero - stejný styl jako Ceník */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              {requests.length} AKTIVNÍCH POPTÁVEK
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Aktuální poptávky
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Prohlédněte si poptávky od zákazníků a pošlete svou nabídku
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* CTA pro fachmany */}
          <div className={`bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-3xl p-8 mb-10 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">
                  💼
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Jste profesionál?</h2>
                  <p className="text-gray-600 mt-1">
                    Registrujte se a reagujte na poptávky. <strong>3 nabídky měsíčně zdarma!</strong>
                  </p>
                </div>
              </div>
              <Link
                href="/auth/register?role=provider"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all whitespace-nowrap"
              >
                Registrovat se zdarma →
              </Link>
            </div>
          </div>

          {/* Filtry */}
          <div className={`bg-white border border-gray-200 rounded-2xl p-6 mb-8 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kategorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokalita</label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Praha, Brno..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Řadit podle</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="newest">Nejnovější</option>
                  <option value="expiring">Brzy končící</option>
                  <option value="budget">Nejvyšší rozpočet</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setLocationFilter("");
                    setSortBy("newest");
                  }}
                  className="w-full px-4 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Zrušit filtry
                </button>
              </div>
            </div>
          </div>

          {/* Počet výsledků */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              <strong className="text-gray-900">{filteredRequests.length}</strong>{" "}
              {filteredRequests.length === 1 ? "poptávka" : filteredRequests.length < 5 ? "poptávky" : "poptávek"}
            </p>
          </div>

          {/* Seznam poptávek */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Načítám poptávky...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-16 text-center">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Žádné poptávky</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {requests.length === 0 
                  ? "Momentálně nejsou žádné aktivní poptávky." 
                  : "Žádné poptávky neodpovídají vašim filtrům."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request, i) => (
                <div 
                  key={request.id} 
                  className={`bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-cyan-300 transition-all ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                    {/* Left - Icon & Category */}
                    <div className="flex items-center gap-4 lg:w-52 flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 rounded-2xl flex items-center justify-center text-2xl">
                        {request.categories?.icon || "📋"}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-cyan-600">{request.categories?.name || "Ostatní"}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(request.created_at)}</p>
                      </div>
                    </div>

                    {/* Middle - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <h2 className="text-lg font-bold text-gray-900">{request.title}</h2>
                        {daysLeft(request.expires_at) <= 3 && (
                          <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                            🔥 Končí brzy
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{request.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
                          📍 {request.location}
                        </span>
                        {(request.budget_min || request.budget_max) && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                            💰 {request.budget_min && `${request.budget_min.toLocaleString()}`}
                            {request.budget_min && request.budget_max && " – "}
                            {request.budget_max && `${request.budget_max.toLocaleString()}`} Kč
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                          ⏳ {daysLeft(request.expires_at)} dní
                        </span>
                        {(request.offers_count || 0) > 0 && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                            👥 {request.offers_count} {request.offers_count === 1 ? 'nabídka' : request.offers_count! < 5 ? 'nabídky' : 'nabídek'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right - Action */}
                    <div className="lg:w-44 flex-shrink-0">
                      <Link
                        href={`/poptavka/${request.id}`}
                        className="block w-full text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
                      >
                        Zobrazit detail →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Bottom */}
          <div className={`mt-20 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 rounded-3xl p-10 lg:p-14 text-center">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-8">
                <span className="text-4xl">📝</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Potřebujete službu?
              </h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg">
                Zadejte poptávku zdarma a nechte fachmany, ať se ozvou vám.
              </p>
              <Link
                href="/nova-poptavka"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Zadat poptávku zdarma →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}