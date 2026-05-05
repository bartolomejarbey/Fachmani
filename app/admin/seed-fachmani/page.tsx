"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import Link from "next/link";
import { iconAsTextPrefix } from "@/app/components/CategoryIcon";
import CategoryIcon from "@/app/components/CategoryIcon";

type SeedProvider = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  locations: string[] | null;
  category_ids: string[] | null;
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

export default function SeedFachmani() {
  const [providers, setProviders] = useState<SeedProvider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: providersData }, { data: categoriesData }] = await Promise.all([
      supabase.from("seed_providers").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, icon"),
    ]);

    setProviders(providersData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase
      .from("seed_providers")
      .update({ is_active: !isActive })
      .eq("id", id);
    loadData();
  };

  const deleteProvider = async (id: string) => {
    if (!confirm("Opravdu smazat tohoto fiktivního fachmana?")) return;
    await supabase.from("seed_providers").delete().eq("id", id);
    loadData();
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return categoryId;
    return `${iconAsTextPrefix(cat.icon)}${cat.name}`;
  };

  const getCategory = (categoryId: string) => categories.find(c => c.id === categoryId);

  const filteredProviders = providers.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎭 Fiktivní fachmani</h1>
            <p className="text-slate-400">Seed data pro naplnění platformy ({providers.length} fachmanů)</p>
          </div>
          <Link
            href="/admin/seed-fachmani/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            <span>+</span> Přidat fiktivního fachmana
          </Link>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Hledat podle jména nebo emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🎭</div>
            <h3 className="text-xl font-bold text-white mb-2">Žádní fiktivní fachmani</h3>
            <p className="text-slate-400 mb-6">Přidejte první fiktivní fachmany pro naplnění platformy.</p>
            <Link
              href="/admin/seed-fachmani/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-500 text-white font-semibold rounded-xl"
            >
              + Přidat prvního fachmana
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className={`bg-slate-800/50 border rounded-2xl p-6 transition-all ${
                  provider.is_active 
                    ? "border-white/10 hover:border-cyan-500/30" 
                    : "border-red-500/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {provider.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{provider.full_name}</h3>
                      <p className="text-slate-500 text-sm">{provider.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {provider.is_verified && (
                      <span className="text-emerald-400" title="Ověřený">✓</span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${provider.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  </div>
                </div>

                {provider.bio && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{provider.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {provider.category_ids?.slice(0, 3).map((catId) => {
                    const cat = getCategory(catId);
                    return (
                      <span key={catId} className="px-2 py-1 bg-white/5 text-slate-300 rounded-lg text-xs inline-flex items-center gap-1">
                        {cat?.icon?.startsWith("iconify:") ? (
                          <CategoryIcon icon={cat.icon} size={12} />
                        ) : null}
                        {cat ? `${iconAsTextPrefix(cat.icon)}${cat.name}` : catId}
                      </span>
                    );
                  })}
                  {(provider.category_ids?.length || 0) > 3 && (
                    <span className="px-2 py-1 bg-white/5 text-slate-500 rounded-lg text-xs">
                      +{(provider.category_ids?.length || 0) - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span>★</span>
                    <span className="text-white font-medium">{provider.rating}</span>
                    <span className="text-slate-500">({provider.review_count})</span>
                  </div>
                  {provider.hourly_rate && (
                    <span className="text-cyan-400 font-medium">{provider.hourly_rate} Kč/h</span>
                  )}
                </div>

                {provider.locations && provider.locations.length > 0 && (
                  <p className="text-slate-500 text-sm mb-4">
                    📍 {provider.locations.slice(0, 2).join(", ")}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  <Link
                    href={`/admin/seed-fachmani/${provider.id}`}
                    className="flex-1 px-3 py-2 bg-white/5 text-slate-300 rounded-lg text-sm font-medium text-center hover:bg-white/10 transition-colors"
                  >
                    Upravit
                  </Link>
                  <button
                    onClick={() => toggleActive(provider.id, provider.is_active)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      provider.is_active
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    }`}
                  >
                    {provider.is_active ? "Deaktivovat" : "Aktivovat"}
                  </button>
                  <button
                    onClick={() => deleteProvider(provider.id)}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}