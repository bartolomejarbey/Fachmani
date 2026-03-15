"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useSettings } from "@/lib/useSettings";

type Promotion = {
  id: string;
  provider_id: string;
  type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  price: number;
  notes: string | null;
  created_at: string;
  provider_name?: string;
  provider_email?: string;
  created_by_name?: string;
};

type Provider = {
  id: string;
  full_name: string;
  email: string;
};

export default function AdminPromo() {
  const { settings } = useSettings();
  const promoTypes = [
    { key: "top_profile", label: "🚀 Topování profilu", price: settings.pricing.top_profile_7d, duration: 7 },
    { key: "boost_feed", label: "📣 Boost na feedu", price: settings.pricing.boost_feed_1d, duration: 1 },
    { key: "premium_badge", label: "⭐ Premium badge", price: settings.pricing.premium_badge_30d, duration: 30 },
    { key: "priority_requests", label: "🎯 Přednostní poptávky", price: 79, duration: 7 },
  ];
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("active");

  // Form state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);

    // Načteme promo
    let query = supabase
      .from("promotions")
      .select(`
        *,
        provider:provider_id (full_name, email),
        creator:created_by (full_name)
      `)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("status", "active");
    } else if (filter === "expired") {
      query = query.eq("status", "expired");
    }

    const { data: promoData } = await query;

    if (promoData) {
      setPromotions(promoData.map(p => ({
        ...p,
        provider_name: (p.provider as { full_name?: string; email?: string } | null)?.full_name,
        provider_email: (p.provider as { full_name?: string; email?: string } | null)?.email,
        created_by_name: (p.creator as { full_name?: string } | null)?.full_name,
      })));
    }

    // Načteme providery pro select
    const { data: providersData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "provider")
      .order("full_name");

    setProviders(providersData || []);
    setLoading(false);
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const promoType = promoTypes.find(t => t.key === selectedType);
    
    const days = customDays ? parseInt(customDays) : (promoType?.duration || 7);
    const price = customPrice ? parseFloat(customPrice) : (promoType?.price || 0);
    
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + days);

    await supabase.from("promotions").insert({
      provider_id: selectedProvider,
      type: selectedType,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price,
      notes: notes || null,
      created_by: user?.id,
    });

    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "create_promo",
      target_type: "promotion",
      details: { provider_id: selectedProvider, type: selectedType, price, days },
    });

    // Reset form
    setSelectedProvider("");
    setSelectedType("");
    setCustomPrice("");
    setCustomDays("");
    setNotes("");
    setShowModal(false);
    setSaving(false);
    loadData();
  };

  const handleStatusChange = async (promoId: string, newStatus: string) => {
    await supabase
      .from("promotions")
      .update({ status: newStatus })
      .eq("id", promoId);

    loadData();
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm("Opravdu smazat tuto promo akci?")) return;
    await supabase.from("promotions").delete().eq("id", promoId);
    loadData();
  };

  const getTypeBadge = (type: string) => {
    const t = promoTypes.find(pt => pt.key === type);
    return t?.label || type;
  };

  const daysRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🚀 Topování & Promo</h1>
            <p className="text-slate-400">Správa propagačních akcí</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            + Nová promo akce
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Aktivní promo", value: promotions.filter(p => p.status === "active").length, color: "text-emerald-400", icon: "🟢" },
            { label: "Tento měsíc", value: promotions.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length, color: "text-blue-400", icon: "📅" },
            { label: "Celkem tržby", value: `${promotions.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()} Kč`, color: "text-cyan-400", icon: "💰" },
            { label: "Expiruje brzy", value: promotions.filter(p => p.status === "active" && daysRemaining(p.ends_at) <= 3).length, color: "text-orange-400", icon: "⚠️" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: "active", label: "🟢 Aktivní" },
            { key: "expired", label: "⏰ Vypršelé" },
            { key: "all", label: "Všechny" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === f.key
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-white mb-2">Žádné promo akce</h3>
              <p className="text-slate-400 mb-6">Vytvořte první promo akci pro fachmany.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-3 bg-cyan-500 text-white font-semibold rounded-xl"
              >
                + Vytvořit promo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Fachman</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Typ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Cena</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Období</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Stav</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Vytvořil</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {promotions.map((promo) => {
                    const days = daysRemaining(promo.ends_at);
                    
                    return (
                      <tr key={promo.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{promo.provider_name}</p>
                          <p className="text-slate-500 text-sm">{promo.provider_email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{getTypeBadge(promo.type)}</span>
                        </td>
                        <td className="px-6 py-4 text-cyan-400 font-medium">
                          {promo.price?.toLocaleString()} Kč
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="text-slate-300">
                            {new Date(promo.starts_at).toLocaleDateString("cs-CZ")} - {new Date(promo.ends_at).toLocaleDateString("cs-CZ")}
                          </p>
                          {promo.status === "active" && (
                            <p className={`text-xs ${days <= 3 ? 'text-orange-400' : 'text-slate-500'}`}>
                              {days > 0 ? `Zbývá ${days} dní` : "Končí dnes"}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                            promo.status === "active" 
                              ? "bg-emerald-500/20 text-emerald-400"
                              : promo.status === "expired"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {promo.status === "active" ? "Aktivní" : promo.status === "expired" ? "Vypršelo" : "Zrušeno"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {promo.created_by_name || "System"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {promo.status === "active" && (
                              <button
                                onClick={() => handleStatusChange(promo.id, "cancelled")}
                                className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
                              >
                                Zrušit
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(promo.id)}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">🚀 Nová promo akce</h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              </div>

              <form onSubmit={handleCreatePromo} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fachman *</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Vyberte fachmana...</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Typ promo *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {promoTypes.map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => {
                          setSelectedType(type.key);
                          setCustomPrice(type.price.toString());
                          setCustomDays(type.duration.toString());
                        }}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                          selectedType === type.key
                            ? "bg-cyan-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        <div>{type.label}</div>
                        <div className="text-xs opacity-70">{type.price} Kč / {type.duration} dní</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cena (Kč)</label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Počet dní</label>
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Poznámka</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Interní poznámka..."
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving || !selectedProvider || !selectedType}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
                  >
                    {saving ? "Ukládám..." : "Vytvořit promo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Zrušit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}