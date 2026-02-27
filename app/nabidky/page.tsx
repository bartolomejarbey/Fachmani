"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Category = { id: string; name: string; icon: string };
type ServiceOffer = {
  id: string;
  title: string;
  description: string;
  location: string;
  price_from: number | null;
  price_to: number | null;
  price_type: string;
  created_at: string;
  provider_id: string;
  profiles: { full_name: string; is_verified: boolean } | null;
  categories: { id: string; name: string; icon: string } | null;
};

export default function NabidkyPage() {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<ServiceOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: cats } = await supabase.from("categories").select("id, name, icon").order("name");
    if (cats) setCategories(cats);
    const { data } = await supabase.from("service_offers").select("*, profiles:provider_id(full_name, is_verified), categories:category_id(id, name, icon)").eq("is_active", true).order("created_at", { ascending: false });
    if (data) { setOffers(data as ServiceOffer[]); setFilteredOffers(data as ServiceOffer[]); }
    setLoading(false);
  };

  useEffect(() => {
    let r = [...offers];
    if (selectedCategory) r = r.filter(o => o.categories?.id === selectedCategory);
    if (locationFilter) r = r.filter(o => o.location?.toLowerCase().includes(locationFilter.toLowerCase()));
    r.sort((a, b) => sortBy === "price_low" ? (a.price_from || 0) - (b.price_from || 0) : sortBy === "price_high" ? (b.price_from || 0) - (a.price_from || 0) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredOffers(r);
  }, [offers, selectedCategory, locationFilter, sortBy]);

  const formatPrice = (o: ServiceOffer) => {
    if (!o.price_from && !o.price_to) return "Dohodou";
    const t = o.price_from && o.price_to ? `${o.price_from.toLocaleString()} – ${o.price_to.toLocaleString()} Kč` : o.price_from ? `od ${o.price_from.toLocaleString()} Kč` : `do ${o.price_to?.toLocaleString()} Kč`;
    return t + (o.price_type === "hourly" ? "/hod" : o.price_type === "daily" ? "/den" : "");
  };

  const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">{offers.length} NABÍDEK</span>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Nabídky od fachmanů</h1>
          <p className="text-xl text-gray-600">Prohlédněte si nabídky od ověřených profesionálů</p>
        </div>
      </section>
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-3xl p-8 mb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center text-3xl">🔍</div>
                <div><h2 className="text-2xl font-bold text-gray-900">Hledáte konkrétní službu?</h2><p className="text-gray-600 mt-1">Zadejte poptávku a nechte fachmany, ať vám pošlou nabídky.</p></div>
              </div>
              <Link href="/nova-poptavka" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all whitespace-nowrap">Zadat poptávku zdarma →</Link>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
            <div className="grid md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kategorie</label><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"><option value="">Všechny</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Lokalita</label><input type="text" value={locationFilter} onChange={e => setLocationFilter(e.target.value)} placeholder="Praha, Brno..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"/></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Řadit</label><select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"><option value="newest">Nejnovější</option><option value="price_low">Nejlevnější</option><option value="price_high">Nejdražší</option></select></div>
              <div className="flex items-end"><button onClick={() => { setSelectedCategory(""); setLocationFilter(""); setSortBy("newest"); }} className="w-full px-4 py-3 bg-gray-100 rounded-xl font-medium">Zrušit filtry</button></div>
            </div>
          </div>
          <p className="text-gray-600 mb-6"><strong>{filteredOffers.length}</strong> {filteredOffers.length === 1 ? "nabídka" : filteredOffers.length < 5 ? "nabídky" : "nabídek"}</p>
          {loading ? <div className="text-center py-20"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div> : filteredOffers.length === 0 ? <div className="bg-gray-50 rounded-3xl p-16 text-center"><div className="text-6xl mb-6">🔧</div><h3 className="text-2xl font-bold">Žádné nabídky</h3></div> : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map(o => (
                <div key={o.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-emerald-300 transition-all">
                  <div className="flex items-start justify-between mb-4"><div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl flex items-center justify-center text-xl">{o.categories?.icon || "🔧"}</div><span className="text-xs text-gray-400">{timeAgo(o.created_at)}</span></div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{o.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">{o.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium">💰 {formatPrice(o)}</span>{o.location && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">📍 {o.location}</span>}</div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{o.profiles?.full_name?.charAt(0) || "?"}</div><p className="text-sm font-medium text-gray-900">{o.profiles?.full_name}{o.profiles?.is_verified && <span className="text-emerald-500 ml-1">✓</span>}</p></div>
                    <Link href={`/fachman/${o.provider_id}`} className="text-emerald-600 text-sm font-semibold hover:text-emerald-700">Profil →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 lg:p-14 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8"><span className="text-4xl">💼</span></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Jste fachman?</h2>
            <p className="text-gray-300 mb-8 max-w-lg mx-auto text-lg">Přidejte svou nabídku služeb a nechte zákazníky, ať vás osloví.</p>
            <Link href="/auth/register?role=provider" className="inline-flex items-center gap-2 bg-white text-gray-900 px-10 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl transition-all">Registrovat se zdarma →</Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
