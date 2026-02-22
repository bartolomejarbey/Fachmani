"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

export default function Cenik() {
  const [userType, setUserType] = useState<"customer" | "provider">("customer");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "quarterly">("monthly");

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
              TRANSPARENTNÍ CENÍK
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Jednoduché a férové ceny
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Žádné skryté poplatky. Platíte pouze za to, co skutečně využijete.
            </p>

            {/* User Type Toggle */}
            <div className="inline-flex items-center p-1.5 bg-gray-100 rounded-2xl">
              <button
                onClick={() => setUserType("customer")}
                className={`px-6 sm:px-8 py-3 rounded-xl font-semibold transition-all ${
                  userType === "customer"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🔍 Hledám službu
              </button>
              <button
                onClick={() => setUserType("provider")}
                className={`px-6 sm:px-8 py-3 rounded-xl font-semibold transition-all ${
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

      {/* ==================== ZÁKAZNÍK - Vše zdarma ==================== */}
      {userType === "customer" && (
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur opacity-20"></div>
              
              <div className="relative bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-xl text-center">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full mb-6">
                  <span className="text-xl">🎉</span>
                  <span className="font-semibold">100% ZDARMA</span>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Pro zákazníky vše zdarma</h2>
                <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
                  Zadávejte neomezený počet poptávek, porovnávejte nabídky a komunikujte s fachmany. Bez jakýchkoliv poplatků.
                </p>

                <div className="grid sm:grid-cols-3 gap-6 mb-10">
                  {[
                    { icon: "📝", title: "Neomezené poptávky", desc: "Zadejte kolik poptávek potřebujete" },
                    { icon: "💬", title: "Neomezená komunikace", desc: "Chatujte s fachmany bez omezení" },
                    { icon: "⭐", title: "Hodnocení a recenze", desc: "Čtěte a pište recenze zdarma" },
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-gray-50 rounded-2xl">
                      <span className="text-3xl mb-3 block">{item.icon}</span>
                      <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/nova-poptavka"
                  className="inline-flex items-center gap-2 gradient-bg text-white px-10 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Zadat poptávku zdarma
                  {Icons.arrowRight}
                </Link>
              </div>
            </div>

            {/* FAQ pro zákazníky */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Časté otázky</h3>
              <div className="space-y-4">
                {[
                  { q: "Je to opravdu úplně zdarma?", a: "Ano, pro zákazníky je platforma 100% zdarma. Zadávání poptávek, komunikace s fachmany i hodnocení - vše bez poplatků." },
                  { q: "Jak fachmani vydělávají?", a: "Fachmani platí za možnost odpovídat na poptávky. Vy jako zákazník neplatíte nic." },
                  { q: "Musím si vybrat nabídku?", a: "Ne, nemáte žádnou povinnost. Můžete si vybrat nabídku, která vám vyhovuje, nebo žádnou." },
                ].map((item, i) => (
                  <details key={i} className="group bg-gray-50 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900">
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

      {/* ==================== FACHMAN - Tarify ==================== */}
      {userType === "provider" && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Billing Toggle */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-5 py-2 rounded-lg font-medium transition-all ${
                    billingPeriod === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Měsíčně
                </button>
                <button
                  onClick={() => setBillingPeriod("quarterly")}
                  className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    billingPeriod === "quarterly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Čtvrtletně
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">-20%</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
              
              {/* FREE */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Start</h3>
                  <p className="text-gray-500 text-sm">Pro vyzkoušení platformy</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">0 Kč</span>
                  <span className="text-gray-500">/měsíc</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    { included: true, text: "3 nabídky měsíčně" },
                    { included: true, text: "Základní profil" },
                    { included: true, text: "Příjem zpráv" },
                    { included: false, text: "Ověřovací badge" },
                    { included: false, text: "Prioritní zobrazení" },
                    { included: false, text: "Statistiky profilu" },
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-3 ${item.included ? 'text-gray-900' : 'text-gray-400'}`}>
                      {item.included ? (
                        <span className="text-emerald-500 flex-shrink-0">{Icons.check}</span>
                      ) : (
                        <span className="text-gray-300 flex-shrink-0">✕</span>
                      )}
                      {item.text}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register?role=provider"
                  className="block w-full text-center py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Začít zdarma
                </Link>
              </div>

              {/* PREMIUM - Highlighted */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur opacity-25"></div>
                <div className="relative bg-white rounded-3xl p-8 border-2 border-cyan-500 shadow-xl">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                      NEJOBLÍBENĚJŠÍ
                    </span>
                  </div>

                  <div className="mb-6 mt-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>
                    <p className="text-gray-500 text-sm">Pro aktivní profesionály</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">
                      {billingPeriod === "monthly" ? "499" : "399"}
                    </span>
                    <span className="text-gray-500"> Kč/měsíc</span>
                    {billingPeriod === "quarterly" && (
                      <p className="text-sm text-emerald-600 mt-1 font-medium">Platba 1 197 Kč čtvrtletně</p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {[
                      { included: true, text: "Neomezené nabídky", highlight: true },
                      { included: true, text: "Rozšířený profil" },
                      { included: true, text: "Ověřovací badge ✓" },
                      { included: true, text: "Prioritní zobrazení" },
                      { included: true, text: "Statistiky profilu" },
                      { included: false, text: "Vlastní URL profilu" },
                    ].map((item, i) => (
                      <li key={i} className={`flex items-center gap-3 ${item.included ? 'text-gray-900' : 'text-gray-400'}`}>
                        {item.included ? (
                          <span className="text-emerald-500 flex-shrink-0">{Icons.check}</span>
                        ) : (
                          <span className="text-gray-300 flex-shrink-0">✕</span>
                        )}
                        <span className={item.highlight ? 'text-cyan-600 font-semibold' : ''}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/register?role=provider&plan=premium"
                    className="block w-full text-center py-4 rounded-xl gradient-bg text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Vybrat Premium
                  </Link>
                </div>
              </div>

              {/* BUSINESS */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Business</h3>
                  <p className="text-gray-500 text-sm">Pro firmy a týmy</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">
                    {billingPeriod === "monthly" ? "1 299" : "1 039"}
                  </span>
                  <span className="text-gray-500"> Kč/měsíc</span>
                  {billingPeriod === "quarterly" && (
                    <p className="text-sm text-emerald-600 mt-1 font-medium">Platba 3 117 Kč čtvrtletně</p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    { included: true, text: "Vše z Premium" },
                    { included: true, text: "Vlastní URL profilu" },
                    { included: true, text: "Logo firmy v profilu" },
                    { included: true, text: "Více členů týmu" },
                    { included: true, text: "API přístup" },
                    { included: true, text: "Prioritní podpora" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-900">
                      <span className="text-emerald-500 flex-shrink-0">{Icons.check}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register?role=provider&plan=business"
                  className="block w-full text-center py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Vybrat Business
                </Link>
              </div>
            </div>

            {/* ==================== Příplatkové služby ==================== */}
            <div className="mb-16">
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                  💎 PŘÍPLATKOVÉ SLUŽBY
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Zvyšte svou viditelnost
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Platíte jen když využijete. Vše se účtuje na konci měsíce - žádné platby předem.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { 
                    icon: "🚀", 
                    title: "Topování profilu", 
                    price: "99 Kč", 
                    period: "/ 7 dní",
                    desc: "Zobrazení na předních pozicích ve výsledcích"
                  },
                  { 
                    icon: "📣", 
                    title: "Boost na feedu", 
                    price: "49 Kč", 
                    period: "/ den",
                    desc: "Zvýrazněný příspěvek v nástěnce"
                  },
                  { 
                    icon: "🤖", 
                    title: "AI popisek", 
                    price: "29 Kč", 
                    period: "/ použití",
                    desc: "AI vytvoří profesionální popis z fotek"
                  },
                  { 
                    icon: "⭐", 
                    title: "Premium badge", 
                    price: "199 Kč", 
                    period: "/ měsíc",
                    desc: "Zlatý odznak důvěryhodnosti"
                  },
                  { 
                    icon: "📊", 
                    title: "Rozšířené statistiky", 
                    price: "149 Kč", 
                    period: "/ měsíc",
                    desc: "Detailní analytics vašeho profilu"
                  },
                  { 
                    icon: "🎯", 
                    title: "PPC reklama", 
                    price: "od 5 Kč", 
                    period: "/ klik",
                    desc: "Cílená reklama ve feedu"
                  },
                  { 
                    icon: "📸", 
                    title: "Profi úprava fotek", 
                    price: "199 Kč", 
                    period: "/ sada",
                    desc: "Profesionální úprava vašich fotek"
                  },
                  { 
                    icon: "🏆", 
                    title: "Přednostní poptávky", 
                    price: "79 Kč", 
                    period: "/ poptávka",
                    desc: "Přednostní přístup k novým poptávkám"
                  },
                ].map((service, i) => (
                  <div 
                    key={i} 
                    className="group p-5 bg-white border border-gray-200 rounded-2xl hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <span className="text-2xl mb-3 block">{service.icon}</span>
                    <h3 className="font-semibold text-gray-900 mb-1">{service.title}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-lg font-bold text-cyan-600">{service.price}</span>
                      <span className="text-sm text-gray-400">{service.period}</span>
                    </div>
                    <p className="text-sm text-gray-500">{service.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pay Later Box */}
            <div className="bg-gradient-to-br from-gray-50 to-cyan-50 rounded-3xl p-8 sm:p-10 border border-gray-200 text-center">
              <span className="text-4xl mb-4 block">💳</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Platba až na konci měsíce</h3>
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                Žádné platby předem. Používejte služby spontánně a na konci měsíce dostanete přehlednou fakturu. 
                Jako u telefonu nebo elektřiny.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-500">{Icons.check}</span>
                  Bez závazků
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-500">{Icons.check}</span>
                  Přehledná faktura
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-500">{Icons.check}</span>
                  14 dní splatnost
                </span>
              </div>
            </div>

            {/* FAQ pro fachmany */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Časté otázky</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { q: "Kolik nabídek mohu poslat zdarma?", a: "V tarifu Start můžete poslat 3 nabídky měsíčně zdarma. Pro neomezené nabídky doporučujeme tarif Premium." },
                  { q: "Jak funguje platba na konci měsíce?", a: "Všechny příplatkové služby se sčítají a na konci měsíce vám pošleme fakturu. Máte 14 dní na zaplacení." },
                  { q: "Mohu kdykoliv zrušit?", a: "Ano, předplatné můžete zrušit kdykoliv. Platí do konce zaplaceného období." },
                  { q: "Co je ověřovací badge?", a: "Ověřovací badge znamená, že jste prošli ověřením identity přes BankID. Zákazníci vám budou více důvěřovat." },
                ].map((item, i) => (
                  <details key={i} className="group bg-gray-50 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900">
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

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Připraveni začít?
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center justify-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Zadat poptávku zdarma
            </Link>
            <Link
              href="/auth/register?role=provider"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Registrovat jako fachman
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}