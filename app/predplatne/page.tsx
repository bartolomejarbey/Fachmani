"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/useSettings";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Profile = {
  id: string;
  full_name: string;
  subscription_type: string;
  subscription_expires_at: string | null;
  monthly_offers_count: number;
  monthly_offers_reset_at: string;
  cancel_at_period_end: boolean | null;
  cancellation_reason: string | null;
};

export default function Predplatne() {
  const router = useRouter();
  const { settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
        price: plan === "premium" ? settings.subscriptions.premium_monthly : settings.subscriptions.business_monthly,
        expires_at: expiresAt.toISOString(),
      });

      setMessage(`Úspěšně jste přešli na ${plan === "premium" ? "Premium" : "Business"} plán!`);
      setProfile({ ...profile, subscription_type: plan, subscription_expires_at: expiresAt.toISOString() });
    }

    setUpgrading(false);
  };

  const handleCancelAtPeriodEnd = async () => {
    if (!profile) return;
    setCancelling(true);
    setMessage("");
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Chyba: ${data.error ?? "Zrušení se nezdařilo"}`);
      } else {
        setProfile({
          ...profile,
          cancel_at_period_end: true,
          cancellation_reason: cancelReason || null,
          subscription_expires_at: data.expiresAt ?? profile.subscription_expires_at,
        });
        setShowCancelModal(false);
        setCancelReason("");
        setMessage("Předplatné bude ukončeno na konci aktuálního období.");
      }
    } catch {
      setMessage("Chyba: nelze se připojit k serveru.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    if (!profile) return;
    setCancelling(true);
    setMessage("");
    try {
      const res = await fetch("/api/subscription/cancel", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Chyba: ${data.error ?? "Obnovení selhalo"}`);
      } else {
        setProfile({ ...profile, cancel_at_period_end: false, cancellation_reason: null });
        setMessage("Předplatné bylo obnoveno — bude pokračovat dál.");
      }
    } catch {
      setMessage("Chyba: nelze se připojit k serveru.");
    } finally {
      setCancelling(false);
    }
  };

  const freeLimit = settings.platform.free_offers_per_month;
  const getOffersRemaining = () => {
    if (profile?.subscription_type !== "free") return "Neomezené";
    return `${freeLimit - (profile?.monthly_offers_count || 0)} z ${freeLimit}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/dashboard/fachman" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
            ← Zpět na dashboard
          </Link>
          <h1 className="mt-2 text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
            Moje předplatné
          </h1>
          <p className="text-gray-600 mt-2">Spravujte si plán a sledujte zbývající nabídky.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes("Chyba") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}

        {/* Banner: naplánované zrušení */}
        {profile?.cancel_at_period_end && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">⏳ Předplatné bude ukončeno</p>
              <p className="text-sm text-amber-800 mt-1">
                Vaše Premium zůstává aktivní do{" "}
                <strong>
                  {profile.subscription_expires_at
                    ? new Date(profile.subscription_expires_at).toLocaleDateString("cs-CZ")
                    : "konce zaplaceného období"}
                </strong>
                . Pak vás převedeme na Free.
              </p>
            </div>
            <button
              onClick={handleReactivate}
              disabled={cancelling}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold whitespace-nowrap disabled:opacity-50"
            >
              {cancelling ? "..." : "Obnovit"}
            </button>
          </div>
        )}

        {/* Aktuální plán */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Aktuální plán</h2>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-extrabold ${
                  profile?.subscription_type === "premium" ? "bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent" :
                  profile?.subscription_type === "business" ? "text-purple-700" :
                  "text-gray-700"
                }`}>
                  {profile?.subscription_type === "premium" ? "Premium" :
                   profile?.subscription_type === "business" ? "Business" :
                   "Start (zdarma)"}
                </span>
                {profile?.subscription_type !== "free" && (
                  <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Aktivní
                  </span>
                )}
              </div>

              {profile?.subscription_expires_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Platí do: {new Date(profile.subscription_expires_at).toLocaleDateString("cs-CZ")}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Zbývající nabídky tento měsíc</p>
              <p className="text-2xl font-bold text-gray-900">{getOffersRemaining()}</p>
            </div>
          </div>
        </div>

        {/* Plány */}
        <h2 className="text-xl font-semibold mb-4">
          {profile?.subscription_type === "free" ? "Upgradovat plán" : "Změnit plán"}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-2 ${
            profile?.subscription_type === "free" ? "border-purple-500" : "border-gray-100"
          }`}>
            <h3 className="font-bold text-xl mb-1 text-gray-900">Start</h3>
            <p className="text-3xl font-extrabold mb-1 text-gray-900">Zdarma</p>
            <p className="text-xs text-gray-500 mb-4">Pro začátek či jednorázové projekty</p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li>✓ {freeLimit} nabídek měsíčně</li>
              <li>✓ Základní profil</li>
              <li>✓ Interní chat</li>
            </ul>
            {profile?.subscription_type === "free" ? (
              <span className="block text-center text-gray-500 py-2.5 font-semibold">Aktuální plán</span>
            ) : profile?.cancel_at_period_end ? (
              <span className="block text-center text-amber-600 text-sm py-2.5">Naplánováno zrušení</span>
            ) : (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={upgrading || cancelling}
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Zrušit předplatné
              </button>
            )}
          </div>

          {/* Premium — vyzdviženo */}
          <div className={`relative bg-white rounded-2xl shadow-xl p-6 border-2 ${
            profile?.subscription_type === "premium" ? "border-purple-500" : "border-purple-200"
          }`}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              Doporučeno
            </span>
            <h3 className="font-bold text-xl mb-1 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Premium</h3>
            <p className="text-3xl font-extrabold mb-1 text-gray-900">
              {settings.subscriptions.premium_monthly} Kč
              <span className="text-sm font-normal text-gray-500">/měsíc</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">Pro aktivní fachmany s pravidelnou poptávkou</p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li>✓ Neomezené nabídky</li>
              <li>✓ Až 3 kategorie</li>
              <li>✓ Publikování ve feedu</li>
              <li>✓ Premium badge na profilu</li>
              <li>✓ SMS notifikace urgentních poptávek</li>
            </ul>
            {profile?.subscription_type === "premium" ? (
              <span className="block text-center text-gray-500 py-2.5 font-semibold">Aktuální plán</span>
            ) : (
              <button
                onClick={() => handleUpgrade("premium")}
                disabled={upgrading}
                className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {upgrading ? "Zpracovávám..." : "Pořídit Premium"}
              </button>
            )}
          </div>

          {/* Business */}
          <div className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-2 ${
            profile?.subscription_type === "business" ? "border-purple-500" : "border-gray-100"
          }`}>
            <h3 className="font-bold text-xl mb-1 text-gray-900">Business</h3>
            <p className="text-3xl font-extrabold mb-1 text-gray-900">
              {settings.subscriptions.business_monthly.toLocaleString()} Kč
              <span className="text-sm font-normal text-gray-500">/měsíc</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">Pro firmy a větší týmy</p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li>✓ Vše z Premium</li>
              <li>✓ Firemní profil</li>
              <li>✓ Až 5 uživatelů</li>
              <li>✓ API přístup</li>
            </ul>
            {profile?.subscription_type === "business" ? (
              <span className="block text-center text-gray-500 py-2.5 font-semibold">Aktuální plán</span>
            ) : (
              <button
                onClick={() => handleUpgrade("business")}
                disabled={upgrading}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50"
              >
                {upgrading ? "Zpracovávám..." : "Pořídit Business"}
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Platby jsou v testovacím režimu — produkční platební brána (ComGate) bude napojena po doručení API klíčů.
        </p>
      </div>

      <Footer />

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Zrušit předplatné</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vaše Premium zůstane aktivní do{" "}
              <strong>
                {profile?.subscription_expires_at
                  ? new Date(profile.subscription_expires_at).toLocaleDateString("cs-CZ")
                  : "konce zaplaceného období"}
              </strong>
              . Pak vás převedeme na Free. Můžete kdykoli obnovit.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Důvod zrušení (volitelné)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Pomůžete nám zlepšit službu — co bylo důvodem?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                disabled={cancelling}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Nechat aktivní
              </button>
              <button
                onClick={handleCancelAtPeriodEnd}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {cancelling ? "Ruším..." : "Zrušit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}