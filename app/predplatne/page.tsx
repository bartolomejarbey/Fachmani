"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string;
  subscription_type: string;
  subscription_expires_at: string | null;
  monthly_offers_count: number;
  monthly_offers_reset_at: string;
};

export default function Predplatne() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        if (data.role !== "provider") {
          router.push("/dashboard");
          return;
        }
        setProfile(data);
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleUpgrade = async (plan: string) => {
    if (!profile) return;
    
    setUpgrading(true);
    setMessage("");

    // Pro teď simulujeme upgrade - v produkci by zde byla platební brána
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_type: plan,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setMessage("Chyba při upgradu. Zkuste to znovu.");
    } else {
      // Záznam do historie
      await supabase.from("subscriptions").insert({
        user_id: profile.id,
        plan: plan,
        price: plan === "premium" ? 499 : 1299,
        expires_at: expiresAt.toISOString(),
      });

      setMessage(`Úspěšně jste přešli na ${plan === "premium" ? "Premium" : "Business"} plán!`);
      setProfile({ ...profile, subscription_type: plan, subscription_expires_at: expiresAt.toISOString() });
    }

    setUpgrading(false);
  };

  const handleDowngrade = async () => {
    if (!profile) return;
    
    setUpgrading(true);

    await supabase
      .from("profiles")
      .update({
        subscription_type: "free",
        subscription_expires_at: null,
      })
      .eq("id", profile.id);

    setMessage("Přešli jste na bezplatný plán.");
    setProfile({ ...profile, subscription_type: "free", subscription_expires_at: null });
    setUpgrading(false);
  };

  const getOffersRemaining = () => {
    if (profile?.subscription_type !== "free") return "Neomezené";
    return `${3 - (profile?.monthly_offers_count || 0)} z 3`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/fachman" className="text-gray-600 hover:text-gray-900">
              ← Zpět na dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Moje předplatné</h1>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes("Chyba") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}

        {/* Aktuální plán */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Aktuální plán</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${
                  profile?.subscription_type === "premium" ? "text-blue-600" :
                  profile?.subscription_type === "business" ? "text-purple-600" :
                  "text-gray-600"
                }`}>
                  {profile?.subscription_type === "premium" ? "Premium" :
                   profile?.subscription_type === "business" ? "Business" :
                   "Start (zdarma)"}
                </span>
                {profile?.subscription_type !== "free" && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                    Aktivní
                  </span>
                )}
              </div>
              
              {profile?.subscription_expires_at && (
                <p className="text-gray-500 mt-1">
                  Platí do: {new Date(profile.subscription_expires_at).toLocaleDateString("cs-CZ")}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Zbývající nabídky tento měsíc</p>
              <p className="text-2xl font-bold">{getOffersRemaining()}</p>
            </div>
          </div>
        </div>

        {/* Plány */}
        <h2 className="text-xl font-semibold mb-4">
          {profile?.subscription_type === "free" ? "Upgradovat plán" : "Změnit plán"}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
            profile?.subscription_type === "free" ? "border-blue-600" : "border-transparent"
          }`}>
            <h3 className="font-semibold text-lg mb-2">Start</h3>
            <p className="text-3xl font-bold mb-4">Zdarma</p>
            <ul className="text-sm text-gray-600 space-y-2 mb-6">
              <li>✓ 3 nabídky měsíčně</li>
              <li>✓ Základní profil</li>
              <li>✓ Interní chat</li>
            </ul>
            {profile?.subscription_type === "free" ? (
              <span className="block text-center text-gray-500 py-2">Aktuální plán</span>
            ) : (
              <button
                onClick={handleDowngrade}
                disabled={upgrading}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Přejít na Free
              </button>
            )}
          </div>

          {/* Premium */}
          <div className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
            profile?.subscription_type === "premium" ? "border-blue-600" : "border-transparent"
          }`}>
            <h3 className="font-semibold text-lg mb-2">Premium</h3>
            <p className="text-3xl font-bold mb-4">499 Kč<span className="text-sm font-normal text-gray-500">/měsíc</span></p>
            <ul className="text-sm text-gray-600 space-y-2 mb-6">
              <li>✓ Neomezené nabídky</li>
              <li>✓ Zvýrazněný profil</li>
              <li>✓ Prioritní zobrazení</li>
              <li>✓ Statistiky</li>
            </ul>
            {profile?.subscription_type === "premium" ? (
              <span className="block text-center text-gray-500 py-2">Aktuální plán</span>
            ) : (
              <button
                onClick={() => handleUpgrade("premium")}
                disabled={upgrading}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {upgrading ? "Zpracovávám..." : "Upgradovat"}
              </button>
            )}
          </div>

          {/* Business */}
          <div className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
            profile?.subscription_type === "business" ? "border-blue-600" : "border-transparent"
          }`}>
            <h3 className="font-semibold text-lg mb-2">Business</h3>
            <p className="text-3xl font-bold mb-4">1 299 Kč<span className="text-sm font-normal text-gray-500">/měsíc</span></p>
            <ul className="text-sm text-gray-600 space-y-2 mb-6">
              <li>✓ Vše z Premium</li>
              <li>✓ Firemní profil</li>
              <li>✓ Až 5 uživatelů</li>
              <li>✓ API přístup</li>
            </ul>
            {profile?.subscription_type === "business" ? (
              <span className="block text-center text-gray-500 py-2">Aktuální plán</span>
            ) : (
              <button
                onClick={() => handleUpgrade("business")}
                disabled={upgrading}
                className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {upgrading ? "Zpracovávám..." : "Upgradovat"}
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Poznámka: Toto je demo verze. V produkci by byla napojena platební brána.
        </p>
      </div>
    </div>
  );
}