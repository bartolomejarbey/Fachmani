"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import { useSettings } from "@/lib/useSettings";

export default function JakToFunguje() {
  const { settings } = useSettings();
  const freeLimit = settings.platform.free_offers_per_month;
  const premiumPrice = settings.subscriptions.premium_monthly;
  const [userType, setUserType] = useState<"customer" | "provider">("customer");

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
              PRŮVODCE
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Jak Fachmani funguje?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Propojujeme lidi, kteří potřebují služby, s ověřenými profesionály. Jednoduše, rychle a bezpečně.
            </p>

            {/* 20/80 Switch */}
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
        <>
          {/* Steps */}
          <section className="py-16 lg:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 lg:mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  3 jednoduché kroky
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Od poptávky k hotové práci za pár kliknutí
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {[
                  {
                    step: "01",
                    icon: "📝",
                    title: "Zadejte poptávku",
                    description: "Popište co potřebujete, kde a kdy. Přidejte fotky a nastavte rozpočet.",
                    details: ["Zabere to max 2 minuty", "Můžete přidat fotky", "Nastavíte si rozpočet"],
                    color: "cyan"
                  },
                  {
                    step: "02",
                    icon: "📨",
                    title: "Dostanete nabídky",
                    description: "Ověření fachmani z vašeho okolí vám pošlou nabídky s cenou a termínem.",
                    details: [`Průměrně ${freeLimit} nabídky`, "Do 24 hodin", "Vidíte hodnocení fachmanů"],
                    color: "blue"
                  },
                  {
                    step: "03",
                    icon: "🤝",
                    title: "Vyberte a domluvte se",
                    description: "Porovnejte nabídky, prohlédněte si profily a domluvte detaily přes chat.",
                    details: ["Porovnáte ceny", "Přečtete si recenze", "Komunikujete přímo"],
                    color: "emerald"
                  }
                ].map((item, i) => (
                  <div key={i} className="relative group">
                    {i < 2 && (
                      <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                    )}
                    
                    <div className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all duration-300 h-full">
                      <span className="absolute -top-4 -left-4 w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                        {item.step}
                      </span>
                      
                      <div className="text-5xl mb-6">{item.icon}</div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                      <p className="text-gray-600 mb-6">{item.description}</p>
                      
                      <ul className="space-y-2">
                        {item.details.map((detail, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`${
                              item.color === "cyan" ? "text-cyan-500" :
                              item.color === "blue" ? "text-blue-500" :
                              "text-emerald-500"
                            }`}>{Icons.check}</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <Link
                  href="/nova-poptavka"
                  className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Zadat poptávku zdarma
                  {Icons.arrowRight}
                </Link>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 lg:py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Proč využít Fachmani?
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: "💰", title: "100% zdarma", desc: "Pro zákazníky neúčtujeme žádné poplatky" },
                  { icon: "✅", title: "Ověření fachmani", desc: "Každý prochází ověřením přes BankID" },
                  { icon: "⚡", title: "Rychlé nabídky", desc: `Průměrně ${freeLimit} nabídky do 24 hodin` },
                  { icon: "⭐", title: "Reálné recenze", desc: "Hodnocení od skutečných zákazníků" },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 text-center hover:shadow-lg transition-all">
                    <span className="text-4xl mb-4 block">{item.icon}</span>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 lg:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Časté otázky
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { q: "Je to opravdu zdarma?", a: "Ano, pro zákazníky je platforma 100% zdarma. Zadávání poptávek, komunikace s fachmany i hodnocení - vše bez poplatků." },
                  { q: "Jak dlouho trvá než dostanu nabídky?", a: `Většina zákazníků dostane první nabídky do několika hodin. Průměrně máte ${freeLimit} nabídky během 24 hodin.` },
                  { q: "Musím si vybrat některou nabídku?", a: "Ne, nemáte žádnou povinnost. Můžete si vybrat nabídku, která vám vyhovuje, nebo žádnou - je to na vás." },
                  { q: "Jak poznám kvalitního fachmana?", a: "Každý fachman má profil s hodnocením, recenzemi a ukázkami práce. Ověření fachmani mají badge BankID." },
                ].map((item, i) => (
                  <details key={i} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50">
                      {item.q}
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-5 pb-5 text-gray-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ==================== PRO FACHMANY ==================== */}
      {userType === "provider" && (
        <>
          {/* Steps */}
          <section className="py-16 lg:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 lg:mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Začněte získávat zakázky
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Registrace zabere 5 minut a první měsíc máte zdarma
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {[
                  {
                    step: "01",
                    icon: "👤",
                    title: "Vytvořte si profil",
                    description: "Zaregistrujte se, vyplňte profil a přidejte ukázky své práce.",
                    details: ["Registrace do 5 minut", "Přidejte fotky prací", "Nastavte si obory"],
                    color: "cyan"
                  },
                  {
                    step: "02",
                    icon: "🔍",
                    title: "Prohlížejte poptávky",
                    description: "Najděte poptávky ve vašem oboru a okolí. Filtrujte podle lokality nebo rozpočtu.",
                    details: ["Nové poptávky každý den", "Filtr podle lokality", "Notifikace emailem"],
                    color: "blue"
                  },
                  {
                    step: "03",
                    icon: "💼",
                    title: "Posílejte nabídky",
                    description: "Pošlete nabídku s vaší cenou a termínem. Komunikujte se zákazníkem a získejte zakázku.",
                    details: [`${freeLimit} nabídky měsíčně zdarma`, "Přímá komunikace", "Budujete si recenze"],
                    color: "emerald"
                  }
                ].map((item, i) => (
                  <div key={i} className="relative group">
                    {i < 2 && (
                      <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                    )}
                    
                    <div className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 h-full">
                      <span className="absolute -top-4 -left-4 w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        {item.step}
                      </span>
                      
                      <div className="text-5xl mb-6">{item.icon}</div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                      <p className="text-gray-600 mb-6">{item.description}</p>
                      
                      <ul className="space-y-2">
                        {item.details.map((detail, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`${
                              item.color === "cyan" ? "text-cyan-500" :
                              item.color === "blue" ? "text-blue-500" :
                              "text-emerald-500"
                            }`}>{Icons.check}</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <Link
                  href="/auth/register?role=provider"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Registrovat se zdarma
                  {Icons.arrowRight}
                </Link>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 lg:py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Proč se přidat k Fachmani?
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: "🎯", title: "Cílení zákazníci", desc: "Poptávky od lidí, kteří aktivně hledají služby" },
                  { icon: "📍", title: "Lokální zakázky", desc: "Najděte práci přímo ve vašem okolí" },
                  { icon: "⭐", title: "Budujte reputaci", desc: "Sbírejte recenze a zvyšujte důvěryhodnost" },
                  { icon: "📈", title: "Rostěte s námi", desc: "Získejte přístup k novým zákazníkům" },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 text-center hover:shadow-lg transition-all">
                    <span className="text-4xl mb-4 block">{item.icon}</span>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing teaser */}
          <section className="py-16 lg:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">
                  Začněte zdarma
                </h2>
                <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
                  {freeLimit} nabídky měsíčně zdarma. Pro více nabídek si vyberte Premium od {premiumPrice} Kč/měsíc.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/auth/register?role=provider"
                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all"
                  >
                    Registrovat zdarma
                  </Link>
                  <Link
                    href="/cenik"
                    className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                  >
                    Zobrazit ceník
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 lg:py-24 bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Časté otázky
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { q: "Kolik stojí registrace?", a: `Registrace je zcela zdarma. V základním tarifu můžete poslat ${freeLimit} nabídky měsíčně bez poplatků.` },
                  { q: "Kolik nabídek mohu poslat?", a: `V tarifu Start máte ${freeLimit} nabídky měsíčně zdarma. Pro neomezené nabídky doporučujeme Premium (${premiumPrice} Kč/měsíc).` },
                  { q: "Jak funguje ověření BankID?", a: "Ověření přes BankID zvyšuje vaši důvěryhodnost u zákazníků. Zobrazí se vám badge ověřeného fachmana." },
                  { q: "Jak získám více zakázek?", a: "Vyplňte kompletní profil, přidejte fotky prací, sbírejte pozitivní recenze a odpovídejte rychle na poptávky." },
                ].map((item, i) => (
                  <details key={i} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50">
                      {item.q}
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-5 pb-5 text-gray-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Final CTA */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Připraveni začít?
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            {userType === "customer" 
              ? "Zadejte svou první poptávku a získejte nabídky od ověřených profesionálů."
              : "Zaregistrujte se a začněte získávat nové zakázky ještě dnes."
            }
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={userType === "customer" ? "/nova-poptavka" : "/auth/register?role=provider"}
              className="inline-flex items-center justify-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              {userType === "customer" ? "Zadat poptávku zdarma" : "Registrovat jako fachman"}
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}