"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import { useSettings } from "@/lib/useSettings";

export default function Cenik() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const pricing = settings?.pricing ?? { top_profile_7d: 99, boost_feed_1d: 49, premium_badge_30d: 199, extra_offer: 29 };
  const subscriptions = settings?.subscriptions ?? { premium_monthly: 499, premium_quarterly: 399, business_monthly: 1299, business_quarterly: 1039 };
  const platform = settings?.platform ?? { free_offers_per_month: 3, request_expiry_days: 30, max_images_per_request: 5 };
  const loading = !settingsLoaded;

  const [userType, setUserType] = useState<"customer" | "provider">("customer");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "quarterly">("monthly");

  const getPremiumPrice = () => {
    return billingPeriod === "monthly" 
      ? subscriptions.premium_monthly 
      : subscriptions.premium_quarterly;
  };

  const getBusinessPrice = () => {
    return billingPeriod === "monthly" 
      ? subscriptions.business_monthly 
      : subscriptions.business_quarterly;
  };

  const getQuarterlyDiscount = () => {
    const monthlyTotal = subscriptions.premium_monthly;
    const quarterlyPerMonth = subscriptions.premium_quarterly;
    return Math.round((1 - quarterlyPerMonth / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              CENÍK
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Transparentní ceny
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Pro zákazníky 100% zdarma. Pro fachmany flexibilní tarify.
            </p>

            {/* User Type Switch */}
            <div className="inline-flex items-center p-1.5 bg-gray-100 rounded-2xl">
              <button
                onClick={() => setUserType("customer")}
                className={`px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-semibold transition-all text-base sm:text-lg ${
                  userType === "customer"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🔍 Hledám službu
              </button>
              <button
                onClick={() => setUserType("provider")}
                className={`px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-semibold transition-all text-base sm:text-lg ${
                  userType === "provider"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🔧 Jsem fachman
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRO ZÁKAZNÍKY ==================== */}
      {userType === "customer" && (
        <section className="py-16 lg:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Free Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-3xl p-8 sm:p-12 text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                ✓ 100% ZDARMA
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Pro zákazníky neúčtujeme nic
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
                Zadávejte poptávky, komunikujte s fachmany a hodnoťte jejich práci. Vše bez jakýchkoliv poplatků.
              </p>
              <Link
                href="/nova-poptavka"
                className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Zadat poptávku zdarma
                {Icons.arrowRight}
              </Link>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: "📝", title: "Neomezené poptávky", desc: "Zadávejte kolik chcete" },
                { icon: "💬", title: "Neomezená komunikace", desc: "Chatujte s fachmany zdarma" },
                { icon: "⭐", title: "Hodnocení", desc: "Hodnoťte kvalitu práce" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                  <span className="text-4xl mb-4 block">{item.icon}</span>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Časté otázky</h3>
              <div className="space-y-4">
                {[
                  { q: "Opravdu je to zdarma?", a: "Ano, pro zákazníky je platforma 100% zdarma. Neúčtujeme žádné poplatky za zadávání poptávek, komunikaci ani hodnocení." },
                  { q: "Musím si vybrat některou nabídku?", a: "Ne, nemáte žádnou povinnost. Můžete si vybrat nabídku, která vám vyhovuje, nebo žádnou." },
                  { q: "Jak poznám kvalitního fachmana?", a: "Každý fachman má profil s hodnocením, recenzemi a ukázkami práce. Ověření fachmani mají badge." },
                ].map((item, i) => (
                  <details key={i} className="group bg-gray-50 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-100">
                      {item.q}
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-5 pb-5 text-gray-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== PRO FACHMANY ==================== */}
      {userType === "provider" && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Billing Toggle */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                    billingPeriod === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Měsíčně
                </button>
                <button
                  onClick={() => setBillingPeriod("quarterly")}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    billingPeriod === "quarterly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Čtvrtletně
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    -{getQuarterlyDiscount()}%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Start - Free */}
                <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-all">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Start</h3>
                    <p className="text-gray-500 text-sm mt-1">Pro začínající fachmany</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">0 Kč</span>
                    <span className="text-gray-500">/měsíc</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      `${platform.free_offers_per_month} nabídky měsíčně`,
                      "Základní profil",
                      "Příjem zpráv",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <span className="text-emerald-500">✓</span>
                        {item}
                      </li>
                    ))}
                    {[
                      "Ověřovací badge",
                      "Prioritní zobrazení",
                      "Statistiky profilu",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-400">
                        <span>✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/register?role=provider"
                    className="block w-full py-3 text-center border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition-all"
                  >
                    Začít zdarma
                  </Link>
                </div>

                {/* Premium - Highlighted */}
                <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-cyan-500/25 lg:scale-105">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full">
                      NEJOBLÍBENĚJŠÍ
                    </span>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold">Premium</h3>
                    <p className="text-cyan-100 text-sm mt-1">Pro aktivní fachmany</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{getPremiumPrice()} Kč</span>
                    <span className="text-cyan-100">/měsíc</span>
                    {billingPeriod === "quarterly" && (
                      <p className="text-cyan-200 text-sm mt-1">
                        Celkem {getPremiumPrice() * 3} Kč / čtvrtletí
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Neomezené nabídky",
                      "Rozšířený profil",
                      "Ověřovací badge ✓",
                      "Prioritní zobrazení",
                      "Statistiky profilu",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/register?role=provider&plan=premium"
                    className="block w-full py-3 text-center bg-white text-cyan-600 rounded-xl font-semibold hover:bg-cyan-50 transition-all"
                  >
                    Vybrat Premium
                  </Link>
                </div>

                {/* Business */}
                <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-all">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Business</h3>
                    <p className="text-gray-500 text-sm mt-1">Pro firmy a týmy</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{getBusinessPrice()} Kč</span>
                    <span className="text-gray-500">/měsíc</span>
                    {billingPeriod === "quarterly" && (
                      <p className="text-gray-400 text-sm mt-1">
                        Celkem {getBusinessPrice() * 3} Kč / čtvrtletí
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Vše z Premium",
                      "Vlastní URL profilu",
                      "Logo firmy",
                      "Více členů týmu",
                      "API přístup",
                      "Prioritní podpora",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <span className="text-emerald-500">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/register?role=provider&plan=business"
                    className="block w-full py-3 text-center border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition-all"
                  >
                    Vybrat Business
                  </Link>
                </div>
              </div>
            )}

            {/* Add-ons */}
            <div className="mt-20">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
                Příplatkové služby
              </h2>
              <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
                Zvyšte svou viditelnost a získejte více zakázek
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                  {[
                    { icon: "🚀", name: "Topování profilu", price: pricing.top_profile_7d, unit: "7 dní" },
                    { icon: "📣", name: "Boost na feedu", price: pricing.boost_feed_1d, unit: "den" },
                    { icon: "⭐", name: "Premium badge", price: pricing.premium_badge_30d, unit: "měsíc" },
                    { icon: "📨", name: "Extra nabídka", price: pricing.extra_offer, unit: "ks" },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center hover:bg-gray-100 transition-all">
                      <span className="text-3xl mb-3 block">{item.icon}</span>
                      <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                      <p className="text-cyan-600 font-bold">{item.price} Kč<span className="text-gray-400 font-normal">/{item.unit}</span></p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pay Later */}
              <div className="mt-10 max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 text-center">
                  <span className="text-2xl mb-2 block">💳</span>
                  <h4 className="font-bold text-gray-900 mb-2">Platba na konci měsíce</h4>
                  <p className="text-gray-600 text-sm">
                    Všechny příplatkové služby se účtují souhrnně na konci měsíce. Žádné platby předem.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-20 max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Časté otázky</h3>
              <div className="space-y-4">
                {[
                  { q: "Kolik stojí registrace?", a: "Registrace je zcela zdarma. V tarifu Start můžete poslat " + platform.free_offers_per_month + " nabídky měsíčně bez poplatků." },
                  { q: "Mohu tarif kdykoliv změnit?", a: "Ano, tarif můžete kdykoliv upgradovat nebo downgradovat. Změna se projeví od dalšího zúčtovacího období." },
                  { q: "Jak funguje platba na konci měsíce?", a: "Všechny příplatkové služby se sčítají a fakturu dostanete vždy k poslednímu dni měsíce se splatností 14 dní." },
                ].map((item, i) => (
                  <details key={i} className="group bg-gray-50 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-100">
                      {item.q}
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-5 pb-5 text-gray-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}