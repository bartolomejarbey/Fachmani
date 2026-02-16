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
};

export default function PublicPoptavky() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filtry
  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      await supabase.rpc('expire_old_requests');

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      const { data: requestsData } = await supabase
        .from("requests")
        .select("id, title, description, location, budget_min, budget_max, created_at, expires_at, categories(id, name, icon)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (requestsData) {
        setRequests(requestsData as any);
        setFilteredRequests(requestsData as any);
      }

      setLoading(false);
    }

    loadData();
  }, []);

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

    setFilteredRequests(result);
  }, [requests, selectedCategory, locationFilter]);

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Právě přidáno";
    if (diffHours < 24) return `Před ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Včera";
    return `Před ${diffDays} dny`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              AKTUÁLNÍ ZAKÁZKY
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Poptávky od zákazníků
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {requests.length} aktivních poptávek čeká na vaši nabídku
            </p>
          </div>
        </div>
      </section>

      {/* CTA pro fachmany */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`relative rounded-3xl overflow-hidden ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
            
            <div className="relative z-10 px-8 py-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">Jste fachman?</h2>
                <p className="text-emerald-100">
                  Zaregistrujte se a začněte reagovat na poptávky. První 3 nabídky měsíčně zdarma!
                </p>
              </div>
              <Link
                href="/auth/register?role=provider"
                className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all whitespace-nowrap"
              >
                Registrovat se
                {Icons.arrowRight}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Filtry */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
            <div className="grid md:grid-cols-3 gap-4">
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
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setLocationFilter("");
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
            {filteredRequests.length} {filteredRequests.length === 1 ? "poptávka" : filteredRequests.length < 5 ? "poptávky" : "poptávek"}
          </p>

          {/* Seznam */}
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-gray-100 rounded-3xl h-48 animate-pulse"></div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400">{Icons.search}</span>
              </div>
              <p className="text-gray-600 text-lg">
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
                  className={`group bg-white rounded-3xl p-6 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left - Category icon */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {request.categories?.icon || "📋"}
                      </div>
                    </div>

                    {/* Middle - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          {request.categories?.name || "Ostatní"}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{timeAgo(request.created_at)}</span>
                        {daysLeft(request.expires_at) <= 3 && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                            Končí brzy!
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {request.title}
                      </h2>
                      
                      <p className="text-gray-600 line-clamp-2 mb-3">
                        {request.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <span className="text-blue-500">{Icons.location}</span>
                          {request.location}
                        </span>
                        {(request.budget_min || request.budget_max) && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <span className="text-emerald-500">{Icons.briefcase}</span>
                            {request.budget_min && `${request.budget_min.toLocaleString()} Kč`}
                            {request.budget_min && request.budget_max && " - "}
                            {request.budget_max && `${request.budget_max.toLocaleString()} Kč`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right - CTA */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right mb-2">
                        <span className="text-sm text-gray-500">Zbývá</span>
                        <p className={`text-2xl font-bold ${daysLeft(request.expires_at) <= 3 ? 'text-red-500' : 'text-gray-900'}`}>
                          {daysLeft(request.expires_at)} dní
                        </p>
                      </div>
                      <Link
                        href={`/poptavka/${request.id}`}
                        className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                      >
                        Detail
                        {Icons.arrowRight}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Potřebujete službu?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Zadejte poptávku a nechte fachmany, ať se ozvou vám.
          </p>
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
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