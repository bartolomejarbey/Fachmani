"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Settings = {
  pricing: {
    top_profile_7d: number;
    boost_feed_1d: number;
    premium_badge_30d: number;
    extra_offer: number;
  };
  subscription_prices: {
    premium_monthly: number;
    premium_quarterly: number;
    business_monthly: number;
    business_quarterly: number;
  };
  platform_settings: {
    free_offers_per_month: number;
    request_expiry_days: number;
    max_images_per_request: number;
  };
};

export default function AdminNastaveni() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");

  // Form states
  const [pricing, setPricing] = useState({
    top_profile_7d: 99,
    boost_feed_1d: 49,
    premium_badge_30d: 199,
    extra_offer: 29,
  });

  const [subscriptions, setSubscriptions] = useState({
    premium_monthly: 499,
    premium_quarterly: 399,
    business_monthly: 1299,
    business_quarterly: 1039,
  });

  const [platform, setPlatform] = useState({
    free_offers_per_month: 3,
    request_expiry_days: 30,
    max_images_per_request: 5,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("key, value");

    if (data) {
      data.forEach((setting) => {
        if (setting.key === "pricing") {
          setPricing(setting.value);
        } else if (setting.key === "subscription_prices") {
          setSubscriptions(setting.value);
        } else if (setting.key === "platform_settings") {
          setPlatform(setting.value);
        }
      });
    }

    setLoading(false);
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("system_settings")
      .update({ value, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("key", key);

    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "update_settings",
      target_type: "settings",
      details: { key, value },
    });

    setSaving(false);
  };

  const handleSavePricing = () => saveSetting("pricing", pricing);
  const handleSaveSubscriptions = () => saveSetting("subscription_prices", subscriptions);
  const handleSavePlatform = () => saveSetting("platform_settings", platform);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Nastavení systému</h1>
          <p className="text-slate-400">Globální nastavení platformy</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {[
            { key: "pricing", label: "💰 Ceník promo", icon: "💰" },
            { key: "subscriptions", label: "📦 Předplatné", icon: "📦" },
            { key: "platform", label: "🔧 Platforma", icon: "🔧" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pricing Tab */}
        {activeTab === "pricing" && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">💰 Ceník příplatkových služeb</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🚀 Topování profilu (7 dní)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.top_profile_7d}
                    onChange={(e) => setPricing({ ...pricing, top_profile_7d: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-400">Kč</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📣 Boost na feedu (1 den)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.boost_feed_1d}
                    onChange={(e) => setPricing({ ...pricing, boost_feed_1d: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-400">Kč</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ⭐ Premium badge (30 dní)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.premium_badge_30d}
                    onChange={(e) => setPricing({ ...pricing, premium_badge_30d: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-400">Kč</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📨 Extra nabídka
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.extra_offer}
                    onChange={(e) => setPricing({ ...pricing, extra_offer: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-400">Kč</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={handleSavePricing}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? "Ukládám..." : "Uložit změny"}
              </button>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">📦 Ceny předplatného</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <h3 className="text-purple-400 font-semibold mb-4">⭐ Premium</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Měsíčně</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={subscriptions.premium_monthly}
                        onChange={(e) => setSubscriptions({ ...subscriptions, premium_monthly: parseInt(e.target.value) })}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-slate-400">Kč</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Čtvrtletně (za měsíc)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={subscriptions.premium_quarterly}
                        onChange={(e) => setSubscriptions({ ...subscriptions, premium_quarterly: parseInt(e.target.value) })}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-slate-400">Kč</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <h3 className="text-amber-400 font-semibold mb-4">💎 Business</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Měsíčně</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={subscriptions.business_monthly}
                        onChange={(e) => setSubscriptions({ ...subscriptions, business_monthly: parseInt(e.target.value) })}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-slate-400">Kč</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Čtvrtletně (za měsíc)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={subscriptions.business_quarterly}
                        onChange={(e) => setSubscriptions({ ...subscriptions, business_quarterly: parseInt(e.target.value) })}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-slate-400">Kč</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={handleSaveSubscriptions}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? "Ukládám..." : "Uložit změny"}
              </button>
            </div>
          </div>
        )}

        {/* Platform Tab */}
        {activeTab === "platform" && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">🔧 Nastavení platformy</h2>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📨 Nabídky zdarma / měsíc
                </label>
                <input
                  type="number"
                  value={platform.free_offers_per_month}
                  onChange={(e) => setPlatform({ ...platform, free_offers_per_month: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-slate-500 text-xs mt-1">Pro tarif Start</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ⏰ Expirace poptávky (dní)
                </label>
                <input
                  type="number"
                  value={platform.request_expiry_days}
                  onChange={(e) => setPlatform({ ...platform, request_expiry_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-slate-500 text-xs mt-1">Výchozí doba platnosti</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📸 Max obrázků / poptávka
                </label>
                <input
                  type="number"
                  value={platform.max_images_per_request}
                  onChange={(e) => setPlatform({ ...platform, max_images_per_request: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-slate-500 text-xs mt-1">Limit obrázků</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={handleSavePlatform}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? "Ukládám..." : "Uložit změny"}
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">⚠️ Nebezpečná zóna</h2>
          <p className="text-slate-400 text-sm mb-4">
            Tyto akce jsou nevratné. Buďte opatrní.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
              🗑️ Smazat staré logy
            </button>
            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
              🔄 Reset cache
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}