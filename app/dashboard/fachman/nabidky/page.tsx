"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
  is_active: boolean;
  created_at: string;
  category_id: string;
  categories: { name: string; icon: string } | null;
};

export default function MojeNabidkyPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [priceType, setPriceType] = useState("fixed");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "provider") {
      router.push("/dashboard");
      return;
    }

    setCurrentUser({ ...user, profile });
    loadData(user.id);
  };

  const loadData = async (userId: string) => {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, icon")
      .eq("is_active", true)
      .order("name");

    if (categoriesData) setCategories(categoriesData);

    const { data: offersData } = await supabase
      .from("service_offers")
      .select("*, categories:category_id (name, icon)")
      .eq("provider_id", userId)
      .order("created_at", { ascending: false });

    if (offersData) setOffers(offersData as unknown as ServiceOffer[]);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategoryId("");
    setLocation("");
    setPriceFrom("");
    setPriceTo("");
    setPriceType("fixed");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (offer: ServiceOffer) => {
    setTitle(offer.title);
    setDescription(offer.description || "");
    setCategoryId(offer.category_id);
    setLocation(offer.location || "");
    setPriceFrom(offer.price_from?.toString() || "");
    setPriceTo(offer.price_to?.toString() || "");
    setPriceType(offer.price_type);
    setEditingId(offer.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);

    const offerData = {
      provider_id: currentUser.id,
      title,
      description,
      category_id: categoryId || null,
      location,
      price_from: priceFrom ? parseInt(priceFrom) : null,
      price_to: priceTo ? parseInt(priceTo) : null,
      price_type: priceType,
    };

    if (editingId) {
      await supabase
        .from("service_offers")
        .update(offerData)
        .eq("id", editingId);
    } else {
      await supabase.from("service_offers").insert(offerData);
    }

    setSaving(false);
    resetForm();
    loadData(currentUser.id);
  };

  const handleToggleActive = async (offerId: string, currentState: boolean) => {
    await supabase
      .from("service_offers")
      .update({ is_active: !currentState })
      .eq("id", offerId);

    loadData(currentUser.id);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm("Opravdu chcete smazat tuto nabídku?")) return;

    await supabase.from("service_offers").delete().eq("id", offerId);
    loadData(currentUser.id);
  };

  const formatPrice = (offer: ServiceOffer) => {
    if (!offer.price_from && !offer.price_to) return "Dohodou";
    
    const priceText = offer.price_from && offer.price_to 
      ? `${offer.price_from.toLocaleString()} – ${offer.price_to.toLocaleString()} Kč`
      : offer.price_from 
        ? `od ${offer.price_from.toLocaleString()} Kč`
        : `do ${offer.price_to?.toLocaleString()} Kč`;
    
    const typeText = offer.price_type === "hourly" ? "/hod" 
      : offer.price_type === "daily" ? "/den" 
      : "";
    
    return priceText + typeText;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="pt-24 pb-8 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <Link 
            href="/dashboard/fachman" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-cyan-600 mb-4 transition-colors"
          >
            ← Zpět na dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Moje nabídky služeb</h1>
              <p className="text-gray-600 mt-2">Spravujte své nabídky, které vidí zákazníci</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              + Přidat nabídku
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? "Upravit nabídku" : "Nová nabídka služby"}
                  </h2>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Název služby *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="např. Kompletní elektroinstalace"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Popis</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Popište co nabízíte, vaše zkušenosti..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kategorie</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Vyberte kategorii</option>
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
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Praha, Střední Čechy..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cena od (Kč)</label>
                    <input
                      type="number"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      placeholder="500"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cena do (Kč)</label>
                    <input
                      type="number"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      placeholder="1500"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Typ ceny</label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixní cena</option>
                    <option value="hourly">Za hodinu</option>
                    <option value="daily">Za den</option>
                    <option value="negotiable">Dohodou</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Vytvořit nabídku"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Offers List */}
        {offers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Zatím nemáte žádné nabídky</h3>
            <p className="text-gray-600 mb-6">Vytvořte svou první nabídku služby a nechte zákazníky, ať vás osloví.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              + Vytvořit první nabídku
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`bg-white rounded-2xl border p-6 transition-all ${
                  offer.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {offer.categories?.icon || "🔧"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{offer.title}</h3>
                        {!offer.is_active && (
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">Neaktivní</span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{offer.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium">
                          💰 {formatPrice(offer)}
                        </span>
                        {offer.location && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                            📍 {offer.location}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">
                          {offer.categories?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(offer.id, offer.is_active)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        offer.is_active
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {offer.is_active ? "✓ Aktivní" : "Aktivovat"}
                    </button>
                    <button
                      onClick={() => handleEdit(offer)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 bg-cyan-50 border border-cyan-200 rounded-2xl p-6">
          <h4 className="font-bold text-cyan-900 mb-2">💡 Tip</h4>
          <p className="text-cyan-800 text-sm">
            Čím více nabídek máte, tím větší je šance, že vás zákazníci najdou. 
            Nezapomeňte uvést realistické ceny a detailní popis služeb.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}