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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-24 pb-12 bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Aktuální poptávky
            </h1>
            <p className="text-xl text-white/80 mb-8">
              {requests.length} aktivních poptávek čeká na vaši nabídku
            </p>
            
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-white font-medium">Live aktualizace</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CTA pro fachmany */}
        <div className={`bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-6 mb-8 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl">
                💼
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Jste profesionál?</h2>
                <p className="text-gray-600">
                  Registrujte se a reagujte na poptávky. <strong>3 nabídky měsíčně zdarma!</strong>
                </p>
              </div>
            </div>
            <Link
              href="/auth/register?role=provider"
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all whitespace-nowrap"
            >
              Registrovat se zdarma →
            </Link>
          </div>
        </div>

        {/* Filtry */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kategorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Řadit podle</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                className="w-full px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
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
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Načítám poptávky...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné poptávky</h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? "Momentálně nejsou žádné aktivní poptávky." 
                : "Žádné poptávky neodpovídají vašim filtrům."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request, i) => (
              <div 
                key={request.id} 
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-cyan-200 transition-all ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left - Icon & Category */}
                  <div className="flex items-center gap-4 lg:w-48 flex-shrink-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-2xl">
                      {request.categories?.icon || "📋"}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-cyan-600">{request.categories?.name || "Ostatní"}</span>
                      <p className="text-xs text-gray-400">{timeAgo(request.created_at)}</p>
                    </div>
                  </div>

                  {/* Middle - Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <h2 className="text-lg font-bold text-gray-900 truncate">{request.title}</h2>
                      {daysLeft(request.expires_at) <= 3 && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                          🔥 Končí brzy
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{request.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                        📍 {request.location}
                      </span>
                      {(request.budget_min || request.budget_max) && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                          💰 {request.budget_min && `${request.budget_min.toLocaleString()}`}
                          {request.budget_min && request.budget_max && " - "}
                          {request.budget_max && `${request.budget_max.toLocaleString()}`} Kč
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                        ⏳ {daysLeft(request.expires_at)} dní
                      </span>
                      {(request.offers_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                          👥 {request.offers_count} nabídek
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right - Action */}
                  <div className="lg:w-40 flex-shrink-0">
                    <Link
                      href={`/poptavka/${request.id}`}
                      className="block w-full text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Zobrazit →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Bottom */}
        <div className={`mt-16 text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Potřebujete službu?
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Zadejte poptávku zdarma a nechte fachmany, ať se ozvou vám.
            </p>
            <Link
              href="/nova-poptavka"
              className="inline-block bg-white text-gray-900 px-10 py-4 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              Zadat poptávku zdarma →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}