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
  profiles: {
    full_name: string;
    is_verified: boolean;
  } | null;
  categories: {
    id: string;
    name: string;
    icon: string;
  } | null;
};

export default function NabidkyPage() {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<ServiceOffer[]>([]);
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
    const { data: categoriesData } = await supabase.from("categories").select("id, name, icon").order("name");
    if (categoriesData) setCategories(categoriesData);

    const { data: offersData } = await supabase
      .from("service_offers")
      .select("*, profiles:provider_id (full_name, is_verified), categories:category_id (id, name, icon)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (offersData) {
      setOffers(offersData as any);
      setFilteredOffers(offersData as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    let result = [...offers];
    if (selectedCategory) result = result.filter(o => o.categories?.id === selectedCategory);
    if (locationFilter) result = result.filter(o => o.location?.toLowerCase().includes(locationFilter.toLowerCase()));
    if (sortBy === "newest") result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "price_low") result.sort((a, b) => (a.price_from || 0) - (b.price_from || 0));
    else if (sortBy === "price_high") result.sort((a, b) => (b.price_from || 0) - (a.price_from || 0));
    setFilteredOffers(result);
  }, [offers, selectedCategory, locationFilter, sortBy]);

  const formatPrice = (offer: ServiceOffer) => {
    if (!offer.price_from && !offer.price_to) return "Dohodou";
    const priceText = offer.price_from && offer.price_to 
      ? `${offer.price_from.toLocaleString()} – ${offer.price_to.toLocaleString()} Kč`
      : offer.price_from ? `od ${offer.price_from.toLocaleString()} Kč` : `do ${offer.price_to?.toLocaleString()} Kč`;
    const typeText = offer.price_type === "hourly" ? "/hod" : offer.price_type === "daily" ? "/den" : "";
    return priceText + typeText;
  };

  const timeAgo = (date: string) => {
    const diffMins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diffMins < 60) return `před ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `před ${diffHours}h`;
    return `před ${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              {offers.length} NABÍDEK
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Nabídky od fachmanů</h1>
            <p className="text-xl text-gray-600">Prohlédněte si nabídky od ověřených profesionálů</p>
          </div>
        </div>
      </section>
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
            <div className="grid md:grid-cols-4 gap-4">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-3 border rounded-xl">
                <option value="">Všechny kategorie</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
              <input type="text" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Lokalita" className="px-4 py-3 border rounded-xl" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-3 border rounded-xl">
                <option value="newest">Nejnovější</option>
                <option value="price_low">Nejlevnější</option>
                <option value="price_high">Nejdražší</option>
              </select>
              <button onClick={() => { setSelectedCategory(""); setLocationFilter(""); setSortBy("newest"); }} className="px-4 py-3 bg-gray-100 rounded-xl">Zrušit filtry</button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-20"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
          ) : filteredOffers.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-16 text-center"><div className="text-6xl mb-6">🔧</div><h3 className="text-2xl font-bold">Žádné nabídky</h3></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer) => (
                <div key={offer.id} className="bg-white border rounded-2xl p-6 hover:shadow-lg transition-all">
                  <div className="flex justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">{offer.categories?.icon || "🔧"}</div>
                    <span className="text-xs text-gray-400">{timeAgo(offer.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{offer.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">{offer.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm">💰 {formatPrice(offer)}</span>
                    {offer.location && <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm">📍 {offer.location}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{offer.profiles?.full_name?.charAt(0)}</div>
                      <span className="text-sm font-medium">{offer.profiles?.full_name}</span>
                    </div>
                    <Link href={`/fachman/${offer.provider_id}`} className="text-emerald-600 text-sm font-semibold">Profil →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
