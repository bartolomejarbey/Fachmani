"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useSettings } from "@/lib/useSettings";

type ProviderAvatar = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type Category = {
  id: string;
  icon: string;
  name: string;
  slug: string;
  count: number;
};

type Request = {
  id: string;
  title: string;
  location: string;
  budget_max: number | null;
  created_at: string;
  category_icon?: string;
  offers_count?: number;
};

export default function Home() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats, setStats] = useState({
    providers: 0,
    requests: 0,
    completed: 0,
    avgRating: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [topProviders, setTopProviders] = useState<ProviderAvatar[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    Promise.all([loadStats(), loadRecentRequests(), loadCategories(), loadTopProviders()])
      .finally(() => setDataLoaded(true));
  }, []);

  const loadStats = async () => {
    const { count: realProviders } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "provider");

    const { count: seedProviders } = await supabase
      .from("seed_providers")
      .select("*", { count: "exact", head: true });

    // Expire old requests (may fail if RPC not created yet)
    await supabase.rpc('expire_old_requests');

    const now = new Date().toISOString();
    const { count: activeRequests } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .or(`expires_at.gt.${now},expires_at.is.null`);

    const { count: completedRequests } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { data: ratingData } = await supabase
      .from("reviews")
      .select("rating");

    const avgRating = ratingData && ratingData.length > 0
      ? Math.round((ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length) * 10) / 10
      : 4.8;

    setStats({
      providers: (realProviders || 0) + (seedProviders || 0),
      requests: activeRequests || 0,
      completed: completedRequests || 0,
      avgRating,
    });
  };

  const loadCategories = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, icon, slug, parent_id, sort_order")
      .order("sort_order");

    if (cats) {
      const { data: providerCategories } = await supabase
        .from("provider_categories")
        .select("category_id");

      const countsByCat: Record<string, number> = {};
      providerCategories?.forEach((pc) => {
        countsByCat[pc.category_id] = (countsByCat[pc.category_id] || 0) + 1;
      });

      const childrenByParent: Record<string, string[]> = {};
      cats.forEach((c) => {
        if (c.parent_id) {
          (childrenByParent[c.parent_id] ??= []).push(c.id);
        }
      });

      const mains = cats
        .filter((c) => c.parent_id === null)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "cs"))
        .slice(0, 8);

      setCategories(
        mains.map((c) => {
          const directCount = countsByCat[c.id] || 0;
          const childCount = (childrenByParent[c.id] || []).reduce(
            (sum, childId) => sum + (countsByCat[childId] || 0),
            0
          );
          return {
            id: c.id,
            name: c.name,
            icon: c.icon,
            slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "-"),
            count: directCount + childCount,
          };
        })
      );
    }
  };

  const loadTopProviders = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("role", "provider")
      .eq("is_verified", true)
      .not("avatar_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data && data.length > 0) {
      setTopProviders(data);
    }
  };

  const loadRecentRequests = async () => {
    const { data } = await supabase
      .from("requests")
      .select(`
        id,
        title,
        location,
        budget_max,
        created_at,
        categories:category_id (icon)
      `)
      .eq("status", "active")
      .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) {
      const requestIds = data.map(r => r.id);
      const { data: offersData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      setRecentRequests(data.map(r => ({
        ...r,
        category_icon: (r.categories as { icon?: string } | null)?.icon || "📋",
        offers_count: offersCounts[r.id] || 0,
      })));
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % Math.max(recentRequests.length, 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + Math.max(recentRequests.length, 1)) % Math.max(recentRequests.length, 1));

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

  const formatBudget = (budget: number | null) => {
    if (!budget) return "Dle nabídek";
    return `${budget.toLocaleString()} Kč`;
  };

  return (
    <div className="min-h-screen bg-white" style={{ overflowX: "hidden", width: "100%" }}>
      <Navbar />

      {/* ==================== HERO ==================== */}
      <section className="relative bg-gradient-to-br from-cyan-50 via-white to-blue-50" style={{ paddingTop: "100px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            
            {/* LEFT - Text */}
            <div className="text-center lg:text-left mb-8 lg:mb-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white shadow-md px-4 py-2 rounded-full mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm text-gray-600">
                  {dataLoaded ? (
                    <strong className="text-emerald-600">{stats.requests}</strong>
                  ) : (
                    <span className="inline-block w-5 h-4 bg-emerald-200 rounded animate-pulse align-middle" />
                  )}{" "}aktivních poptávek
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" style={{ lineHeight: "1.1" }}>
                Najděte{" "}
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  fachmana
                </span>
                <br />
                <span className="text-gray-400">na cokoliv</span>
              </h1>

              {/* Desc */}
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
                Od řemeslníků po marketing, IT až po hlídání dětí. Získejte nabídky od ověřených profesionálů do 24 hodin.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  href="/nova-poptavka"
                  className="block sm:inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-xl text-base font-semibold text-center shadow-lg hover:shadow-xl transition-shadow"
                >
                  Zadat poptávku zdarma
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="block sm:inline-block bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-base font-semibold text-center hover:border-gray-300 transition-colors"
                >
                  Jak to funguje
                </Link>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                  ✓ Ověření na naší platformě
                </span>
                <span className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full text-sm font-medium">
                  ⚡ Nabídky do 24h
                </span>
                <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                  🛡️ 100% zdarma
                </span>
              </div>

              {/* Trust */}
              <div className="flex items-center justify-center lg:justify-start gap-6 h-10">
                {dataLoaded ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {(topProviders.length > 0 ? topProviders.slice(0, 4) : [{id:"1",full_name:"F",avatar_url:null},{id:"2",full_name:"A",avatar_url:null},{id:"3",full_name:"C",avatar_url:null},{id:"4",full_name:"H",avatar_url:null}]).map((provider) => (
                          provider.avatar_url ? (
                            <img key={provider.id} src={provider.avatar_url} alt={provider.full_name} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                          ) : (
                            <div key={provider.id} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white flex items-center justify-center text-sm font-bold text-cyan-700">
                              {provider.full_name.charAt(0)}
                            </div>
                          )
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        <strong className="text-gray-900">{stats.providers}+</strong> profesionálů
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-xl">★</span>
                      <span className="text-sm text-gray-600">
                        <strong className="text-gray-900">{stats.avgRating}</strong>/5
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {Array(4).fill(0).map((_, i) => (
                          <div key={i} className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white animate-pulse" />
                        ))}
                      </div>
                      <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT - Slider s poptávkami */}
            <div className={`transition-opacity duration-500 ${dataLoaded ? 'opacity-100' : 'opacity-0'}`}>
              {!dataLoaded ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                    <div className="h-5 w-32 bg-white/30 rounded animate-pulse" />
                  </div>
                  <div className="p-6 space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : recentRequests.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                        <span className="text-white font-semibold">Nové poptávky</span>
                      </div>
                      <span className="text-white/80 text-sm">{currentSlide + 1} / {recentRequests.length}</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="overflow-hidden">
                      <div 
                        className="flex transition-transform duration-300"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {recentRequests.map((req) => (
                          <div key={req.id} className="w-full flex-shrink-0">
                            <Link href={`/poptavka/${req.id}`} className="block space-y-4 hover:opacity-80 transition-opacity cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="text-3xl">{req.category_icon}</span>
                                <span className="text-sm text-gray-400">{timeAgo(req.created_at)}</span>
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{req.title}</h3>
                              <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  📍 {req.location}
                                </span>
                                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  💰 {formatBudget(req.budget_max)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <div className="flex -space-x-1.5">
                                  {Array(Math.min(req.offers_count || 0, 3)).fill(0).map((_, j) => (
                                    <div key={j} className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border-2 border-white text-xs flex items-center justify-center text-white font-bold">
                                      {j + 1}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {req.offers_count || 0} {(req.offers_count || 0) === 1 ? 'nabídka' : (req.offers_count || 0) < 5 ? 'nabídky' : 'nabídek'}
                                </span>
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
                        ←
                      </button>
                      <div className="flex gap-2">
                        {recentRequests.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`h-2 rounded-full transition-all ${i === currentSlide ? 'bg-cyan-500 w-6' : 'bg-gray-200 w-2'}`}
                          />
                        ))}
                      </div>
                      <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
                        →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-600">Zatím žádné aktivní poptávky</p>
                  <Link href="/nova-poptavka" className="text-cyan-600 font-semibold mt-2 inline-block">
                    Zadejte první →
                  </Link>
                </div>
              )}

              <div className="hidden lg:grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-lg">✓</div>
                  <div>
                    <p className="text-xs text-gray-400">Ověření</p>
                    <p className="font-semibold text-gray-900 text-sm">Ověřeno</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-lg">⚡</div>
                  <div>
                    <p className="text-xs text-gray-400">Odpověď</p>
                    <p className="font-semibold text-gray-900 text-sm">Do 24 hodin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      <section className="py-8 lg:py-10 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 transition-opacity duration-500 ${dataLoaded ? 'opacity-100' : 'opacity-0'}`}>
            {dataLoaded ? [
              { value: `${stats.providers}+`, label: "Profesionálů" },
              { value: stats.requests.toString(), label: "Aktivních poptávek" },
              { value: `${stats.completed}+`, label: "Dokončených zakázek" },
              { value: `${stats.avgRating}/5`, label: "Průměrné hodnocení" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            )) : Array(4).fill(0).map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-10 w-20 mx-auto bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-28 mx-auto mt-2 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== JAK TO FUNGUJE ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Jak to funguje?
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Tři jednoduché kroky k nalezení profesionála
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", icon: "🔍", title: "Zadejte poptávku", desc: "Popište co potřebujete a zadejte lokalitu. Zabere to 2 minuty.", color: "bg-cyan-100" },
              { step: "02", icon: "📋", title: "Porovnejte nabídky", desc: "Profesionálové vám pošlou své nabídky s cenami a termíny.", color: "bg-blue-100" },
              { step: "03", icon: "✓", title: "Vyberte a realizujte", desc: "Vyberte nejlepší nabídku a sledujte průběh práce.", color: "bg-emerald-100" },
            ].map((item, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="absolute -top-3 -left-3 w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                  {item.step}
                </span>
                <div className={`w-14 h-14 lg:w-16 lg:h-16 ${item.color} rounded-2xl flex items-center justify-center mb-5 text-2xl lg:text-3xl`}>
                  {item.icon}
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm lg:text-base text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              Vyzkoušet zdarma →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== KATEGORIE ==================== */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 lg:mb-12">
            <div>
              <span className="inline-block bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                KATEGORIE
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-600 font-semibold hover:text-cyan-700">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {categories.length === 0 && !dataLoaded ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 lg:p-6 border border-gray-100">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3 animate-pulse" />
                  <div className="w-24 h-5 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : categories.map((cat, i) => (
              <Link
                key={i}
                href={`/kategorie/${cat.slug}`}
                className="bg-white rounded-xl p-5 lg:p-6 border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all group"
              >
                <div className="text-3xl lg:text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 text-base lg:text-lg">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.count} profesionálů</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PROČ MY ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <span className="inline-block bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              PROČ FACHMANI
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Proč si vybrat nás?
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {[
              { icon: "🛡️", title: "Ověření profesionálové", desc: "Každý prochází ověřením na naší platformě" },
              { icon: "⭐", title: "Reálné recenze", desc: "Hodnocení od skutečných zákazníků" },
              { icon: "⚡", title: "Rychlé nabídky", desc: `Průměrně ${settings.platform.free_offers_per_month} nabídky do 24 hodin` },
              { icon: "💬", title: "Bezpečný chat", desc: "Komunikace přímo v aplikaci" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 lg:p-6">
                <div className="w-14 h-14 lg:w-16 lg:h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl lg:text-3xl">
                  {item.icon}
                </div>
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRO PROFESIONÁLY ==================== */}
      <section className="py-16 lg:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="text-center lg:text-left mb-10 lg:mb-0">
              <span className="inline-block bg-white/10 text-cyan-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                PRO PROFESIONÁLY
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Jste profesionál?
                <br />
                <span className="text-cyan-400">Získejte nové zakázky</span>
              </h2>
              <p className="text-base lg:text-lg text-gray-300 mb-8 max-w-lg mx-auto lg:mx-0">
                Připojte se k síti profesionálů a nechte zákazníky, ať najdou právě vás. Registrace je zdarma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/register?role=provider"
                  className="block sm:inline-block bg-white text-gray-900 px-8 py-4 rounded-xl text-base font-semibold text-center hover:bg-gray-100 transition-colors"
                >
                  Registrovat se zdarma
                </Link>
                <Link
                  href="/cenik"
                  className="block sm:inline-block border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold text-center hover:bg-white/10 transition-colors"
                >
                  Zobrazit ceník
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              {[
                { value: "0 Kč", label: "Registrace zdarma" },
                { value: `${settings.platform.free_offers_per_month}×`, label: "Nabídky měsíčně zdarma" },
                { value: "24h", label: "Průměrná odezva" },
                { value: "98%", label: "Spokojených klientů" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 lg:p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== NEJNOVĚJŠÍ POPTÁVKY ==================== */}
      {recentRequests.length > 0 && (
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10 lg:mb-12">
              <div>
                <span className="inline-block bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                  NEJNOVĚJŠÍ
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Nejnovější poptávky
                </h2>
              </div>
              <Link href="/poptavky" className="text-cyan-600 font-semibold hover:text-cyan-700">
                Zobrazit vše →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentRequests.map((req) => {
                const isNew = (Date.now() - new Date(req.created_at).getTime()) < 24 * 60 * 60 * 1000;
                return (
                  <Link
                    key={req.id}
                    href={`/poptavka/${req.id}`}
                    className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{req.category_icon}</span>
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            NOVÉ
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(req.created_at)}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-cyan-700 transition-colors mb-2 line-clamp-2">
                      {req.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        📍 {req.location}
                      </span>
                      {req.budget_max && (
                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                          💰 {formatBudget(req.budget_max)}
                        </span>
                      )}
                      <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        {req.offers_count || 0} {(req.offers_count || 0) === 1 ? 'nabídka' : (req.offers_count || 0) < 5 ? 'nabídky' : 'nabídek'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Připraveni začít?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-10">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených profesionálů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-10 py-5 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Zadat poptávku zdarma →
          </Link>
          
          <p className="text-gray-500 mt-6 text-sm">
            100% zdarma pro zákazníky • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}