"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { isIOSNative } from "@/lib/native";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  subscription_type: string;
  trial_until: string | null;
  trial_offers_used: number | null;
  bank_verification_status: string | null;
  ares_verified_at: string | null;
  ico: string | null;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  expires_at: string;
  category_name?: string;
  category_icon?: string;
  offers_count?: number;
  categories?: { id: string; name: string; icon: string } | null;
};

type Offer = {
  id: string;
  request_id: string;
  price: number;
  message: string;
  status: string;
  created_at: string;
  request_title?: string;
  request_location?: string;
};

type PlatformSettings = {
  free_offers_per_month: number;
  trial_months?: number;
  trial_offers_limit?: number;
  trial_grace_days?: number;
};

export default function FachmanDashboard() {
  const router = useRouter();
  // App Store 3.1.1: na iOS skrýt všechny CTA na nákup Premium (digitální funkce)
  const [iosNative, setIosNative] = useState(false);
  useEffect(() => { setIosNative(isIOSNative()); }, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "offers">("requests");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  
  // Nastavení z databáze
  const [settings, setSettings] = useState<PlatformSettings>({ free_offers_per_month: 3 });
  const [offersThisMonth, setOffersThisMonth] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Načteme profil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData || profileData.role !== "provider") {
      router.push("/dashboard");
      return;
    }

    // První vstup po registraci → onboarding (gate dle onboarded_at).
    if (!profileData.onboarded_at) {
      router.replace("/onboarding");
      return;
    }

    setProfile(profileData);

    // Načteme nastavení platformy
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "platform_settings")
      .single();

    if (settingsData?.value) {
      setSettings(settingsData.value);
    }

    // Načteme pouze aktivní kategorie
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, icon")
      .eq("is_active", true)
      .order("name");

    setCategories(categoriesData || []);

    // Načteme aktivní poptávky
    const { data: requestsData } = await supabase
      .from("requests")
      .select(`
        *,
        categories (name, icon)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (requestsData) {
      // Spočítáme nabídky pro každou poptávku
      const requestIds = requestsData.map(r => r.id);
      const { data: offersCountData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersCountData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      setRequests(requestsData.map(r => ({
        ...r,
        category_name: r.categories?.name,
        category_icon: r.categories?.icon,
        offers_count: offersCounts[r.id] || 0,
      })));
    }

    // Načteme moje nabídky
    const { data: myOffersData } = await supabase
      .from("offers")
      .select(`
        *,
        requests (title, location)
      `)
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (myOffersData) {
      setMyOffers(myOffersData.map(o => ({
        ...o,
        request_title: o.requests?.title,
        request_location: o.requests?.location,
      })));

      // Spočítáme nabídky tento měsíc
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthOffers = myOffersData.filter(o => 
        new Date(o.created_at) >= startOfMonth
      ).length;
      setOffersThisMonth(thisMonthOffers);
    }

    setLoading(false);
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const filteredRequests = requests.filter(r => {
    if (locationFilter && !r.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    if (categoryFilter && r.categories?.id !== categoryFilter) {
      return false;
    }
    return true;
  });

  const isPremium = profile?.subscription_type === "premium" || profile?.subscription_type === "business";

  // C.F1 / B.F1 — trial pro free fachmana (2 měsíce / 10 reakcí + 7 dní grace)
  const trialOffersLimit = settings.trial_offers_limit ?? 10;
  const trialGraceDays = settings.trial_grace_days ?? 7;
  const trialUsed = profile?.trial_offers_used ?? 0;
  const trialOffersLeft = Math.max(0, trialOffersLimit - trialUsed);
  const trialUntilDate = profile?.trial_until ? new Date(profile.trial_until) : null;
  const trialGraceEndDate = trialUntilDate
    ? new Date(trialUntilDate.getTime() + trialGraceDays * 24 * 60 * 60 * 1000)
    : null;
  const trialDaysLeft = trialUntilDate
    ? Math.max(0, Math.ceil((trialUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const graceDaysLeft = trialGraceEndDate
    ? Math.max(0, Math.ceil((trialGraceEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialExpired = trialUntilDate ? trialUntilDate.getTime() < Date.now() : false;
  const trialInGrace = !isPremium && trialExpired && trialGraceEndDate !== null && trialGraceEndDate.getTime() > Date.now();
  const graceExpired = trialGraceEndDate ? trialGraceEndDate.getTime() < Date.now() : false;
  const trialOffersExhausted = !isPremium && trialOffersLeft === 0;
  // Hard block jen po vypršení grace nebo vyčerpání reakcí
  const trialBlocked = !isPremium && ((trialExpired && graceExpired) || trialOffersExhausted);

  const canSendOffer = isPremium || ((!trialExpired || trialInGrace) && trialOffersLeft > 0);
  const remainingFreeOffers = trialOffersLeft;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-28 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Ahoj, {profile?.full_name}!</p>
          </div>
          <div className="flex items-center gap-3">
            {!profile?.is_verified && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                ⏳ Čeká na ověření
              </span>
            )}
            {isPremium ? (
              <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm font-medium">
                ⭐ {profile?.subscription_type === "business" ? "Business" : "Premium"}
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                Free tarif
              </span>
            )}
          </div>
        </div>

        {/* Unverified-account banner — pushes provider to complete bank verification */}
        {profile && profile.bank_verification_status !== "verified" && (
          <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm ring-4 ring-amber-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-lg">Dokončete ověření účtu</h3>
                <p className="text-sm text-amber-800 mt-1">
                  {profile.bank_verification_status === "pending"
                    ? <>Krok 1 (ARES) hotov. Čekáme na potvrzení vaší 1 Kč platby — admin to obvykle stihne do 24 h. Do té doby u vašeho profilu zůstane badge „Neověřeno".</>
                    : profile.ares_verified_at
                      ? <>Máte hotový krok 1 (ARES) — chybí <strong>krok 2: symbolická 1 Kč platba</strong> z vašeho podnikatelského účtu. Bez něj nemůžete posílat nabídky a u profilu se zobrazí badge „Neověřeno".</>
                      : profile.ico
                        ? <>Vyplnili jste IČO, ale ještě jsme neověřili profil v ARES. <strong>Dokončete oba kroky ověření</strong> ve svém profilu — bez nich nemůžete posílat nabídky.</>
                        : <>Pro odesílání nabídek je nutné <strong>2-krokové ověření identity</strong> (ARES + symbolická 1 Kč platba). Bez ověření u vašeho profilu uvidí poptávající badge „Neověřeno".</>}
                </p>
              </div>
              <Link
                href="/dashboard/profil"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition shrink-0 text-center"
              >
                Dokončit ověření →
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Aktivní poptávky</p>
            <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Moje nabídky</p>
            <p className="text-3xl font-bold text-gray-900">{myOffers.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Přijaté nabídky</p>
            <p className="text-3xl font-bold text-emerald-600">
              {myOffers.filter(o => o.status === "accepted").length}
            </p>
          </div>
          <div className={`rounded-2xl p-6 shadow-sm border ${
            isPremium
              ? "bg-cyan-50 border-cyan-200"
              : trialBlocked
                ? "bg-red-50 border-red-200"
                : trialOffersLeft <= 3
                  ? "bg-amber-50 border-amber-200"
                  : "bg-white border-gray-100"
          }`}>
            <p className="text-gray-500 text-sm mb-1">
              {isPremium ? "Neomezené reakce" : "Zkušební reakce"}
            </p>
            <p className={`text-3xl font-bold ${
              isPremium
                ? "text-cyan-600"
                : trialBlocked
                  ? "text-red-600"
                  : trialOffersLeft <= 3
                    ? "text-amber-600"
                    : "text-gray-900"
            }`}>
              {isPremium ? "∞" : `${trialOffersLeft}/${trialOffersLimit}`}
            </p>
            {!isPremium && !iosNative && (
              <Link href="/cenik" className="text-cyan-600 text-sm font-medium hover:underline">
                Upgradovat →
              </Link>
            )}
          </div>
        </div>

        {/* C.F1 — Trial info banner (free fachman, trial ještě běží) */}
        {!isPremium && !trialBlocked && trialUntilDate && (
          <div className={`rounded-2xl p-4 mb-6 border ${
            (trialDaysLeft !== null && trialDaysLeft <= 7) || trialOffersLeft <= 3
              ? "bg-amber-50 border-amber-200"
              : "bg-cyan-50 border-cyan-200"
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  (trialDaysLeft !== null && trialDaysLeft <= 7) || trialOffersLeft <= 3
                    ? "text-amber-800"
                    : "text-cyan-800"
                }`}>
                  Zkušební období: zbývá {trialOffersLeft} {trialOffersLeft === 1 ? "reakce" : (trialOffersLeft >= 2 && trialOffersLeft <= 4 ? "reakce" : "reakcí")}
                  {trialDaysLeft !== null && (
                    <> a {trialDaysLeft} {trialDaysLeft === 1 ? "den" : (trialDaysLeft >= 2 && trialDaysLeft <= 4 ? "dny" : "dní")}</>
                  )}
                </h3>
                <p className={`text-sm ${
                  (trialDaysLeft !== null && trialDaysLeft <= 7) || trialOffersLeft <= 3
                    ? "text-amber-700"
                    : "text-cyan-700"
                }`}>
                  Po vyčerpání zkušebního období přejdete na Premium pro neomezené reakce a další výhody.
                </p>
              </div>
              {!iosNative && (
              <Link
                href="/cenik"
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                  (trialDaysLeft !== null && trialDaysLeft <= 7) || trialOffersLeft <= 3
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                }`}
              >
                Upgradovat
              </Link>
              )}
            </div>
          </div>
        )}

        {/* B.F1 — Soft block (grace 7 dní po vypršení trial) */}
        {trialInGrace && !trialOffersExhausted && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">
                  Zkušební období vypršelo — zbývá ještě {graceDaysLeft} {graceDaysLeft === 1 ? "den" : "dní"} ochranné lhůty
                </h3>
                <p className="text-orange-700 text-sm">
                  Zkušební období skončilo, ale ještě po dobu {trialGraceDays} dnů můžete reagovat na poptávky.
                  Pro plný přístup bez přerušení aktivujte Premium.
                </p>
                {!iosNative && (
                <Link
                  href="/predplatne"
                  className="inline-block mt-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700"
                >
                  Aktivovat Premium
                </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* C.F1 — Hard block po vyčerpání trialu (grace skončilo nebo reakce došly) */}
        {trialBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⛔</span>
              <div>
                <h3 className="font-semibold text-red-800">
                  {trialOffersExhausted
                    ? `Vyčerpáno ${trialOffersLimit} reakcí`
                    : "Zkušební období i ochranná lhůta vypršely"}
                </h3>
                <p className="text-red-700 text-sm">
                  {trialOffersExhausted
                    ? `Vyčerpali jste všech ${trialOffersLimit} zkušebních reakcí. Pro neomezené reakce přejděte na Premium.`
                    : `Vaše zkušební období i ${trialGraceDays}denní ochranná lhůta skončily. Pro pokračování přejděte na Premium.`}
                </p>
                {!iosNative && (
                <Link
                  href="/predplatne"
                  className="inline-block mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
                >
                  Přejít na Premium
                </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === "requests"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            📋 Dostupné poptávky ({filteredRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === "offers"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            📨 Moje nabídky ({myOffers.length})
          </button>
        </div>

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokalita</label>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Např. Praha..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Všechny kategorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { setLocationFilter(""); setCategoryFilter(""); }}
                    className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Zrušit filtry
                  </button>
                </div>
              </div>
            </div>

            {/* Request List */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné poptávky</h3>
                <p className="text-gray-600">Momentálně nejsou žádné aktivní poptávky odpovídající vašim filtrům.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {request.category_icon && (
                            <span className="text-xl">{request.category_icon}</span>
                          )}
                          <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
                        </div>
                        <p className="text-gray-600 line-clamp-2 mb-3">{request.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                            📍 {request.location}
                          </span>
                          {(request.budget_min || request.budget_max) && (
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                              💰 {request.budget_min?.toLocaleString()} - {request.budget_max?.toLocaleString()} Kč
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                            📨 {request.offers_count} nabídek
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-sm ${
                            daysLeft(request.expires_at) <= 3 
                              ? "bg-red-100 text-red-700" 
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            ⏰ {daysLeft(request.expires_at)} dní
                          </span>
                        </div>
                      </div>
                      <div className="flex lg:flex-col gap-2">
                        <Link
                          href={`/poptavka/${request.id}`}
                          className="flex-1 lg:flex-none text-center px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                        >
                          Detail
                        </Link>
                        {canSendOffer ? (
                          <Link
                            href={`/poptavka/${request.id}#nabidka`}
                            className="flex-1 lg:flex-none text-center px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all font-medium"
                          >
                            Poslat nabídku
                          </Link>
                        ) : (
                          <span className="flex-1 lg:flex-none text-center px-4 py-2 bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed font-medium">
                            {trialExpired ? "Zkušební vypršelo" : "Zkušební vyčerpáno"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Offers Tab */}
        {activeTab === "offers" && (
          <>
            {myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">📨</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné nabídky</h3>
                <p className="text-gray-600">Zatím jste neodeslali žádné nabídky.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map(offer => (
                  <div key={offer.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{offer.request_title}</h3>
                        <p className="text-gray-500 text-sm">📍 {offer.request_location}</p>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{offer.message}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-cyan-600">{offer.price?.toLocaleString()} Kč</p>
                          <p className="text-gray-400 text-xs">
                            {new Date(offer.created_at).toLocaleDateString("cs-CZ")}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          offer.status === "accepted" 
                            ? "bg-emerald-100 text-emerald-700"
                            : offer.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {offer.status === "accepted" ? "✅ Přijato" 
                            : offer.status === "rejected" ? "❌ Odmítnuto" 
                            : "⏳ Čeká"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <Link
            href={`/fachman/${profile?.id}`}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <h3 className="font-semibold text-gray-900">Můj profil</h3>
            <p className="text-gray-500 text-sm">Zobrazit veřejný profil</p>
          </Link>
          <Link
            href="/dashboard/profil"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">✏️</div>
            <h3 className="font-semibold text-gray-900">Upravit profil</h3>
            <p className="text-gray-500 text-sm">Bio, kategorie, lokality</p>
          </Link>
          <Link
            href="/zpravy"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-gray-900">Zprávy</h3>
            <p className="text-gray-500 text-sm">Komunikace se zákazníky</p>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}