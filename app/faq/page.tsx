"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import { useSettings } from "@/lib/useSettings";

export default function FAQ() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"customer" | "provider">("customer");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const faqCustomers = [
    {
      id: "c1",
      question: "Jak zadám poptávku?",
      answer: "Klikněte na tlačítko 'Zadat poptávku', vyplňte formulář s popisem toho, co potřebujete, vyberte kategorii, lokalitu a případně rozpočet. Po odeslání bude vaše poptávka viditelná pro ověřené fachmany."
    },
    {
      id: "c2",
      question: "Je zadání poptávky zdarma?",
      answer: "Ano, zadání poptávky je zcela zdarma a nezávazné. Platíte až za samotnou službu přímo fachmanovi, pokud se dohodnete."
    },
    {
      id: "c3",
      question: "Jak dlouho je poptávka aktivní?",
      answer: `Poptávka je aktivní ${settings.platform.request_expiry_days} dní od vytvoření. Během této doby vám mohou fachmani posílat své nabídky. Po uplynutí doby se poptávka automaticky uzavře.`
    },
    {
      id: "c4",
      question: "Jak vyberu správného fachmana?",
      answer: "Porovnejte nabídky podle ceny, termínu a hodnocení. Prohlédněte si profily fachmanů, jejich portfolio a recenze od ostatních zákazníků. Můžete také komunikovat přes chat a položit doplňující otázky."
    },
    {
      id: "c5",
      question: "Je komunikace bezpečná?",
      answer: "Ano, veškerá komunikace probíhá přes náš zabezpečený interní chat. Vaše kontaktní údaje jsou sdíleny až po vzájemné dohodě."
    },
    {
      id: "c6",
      question: "Co když nejsem spokojený se službou?",
      answer: "Po dokončení služby můžete ohodnotit fachmana a napsat recenzi. V případě problémů nás kontaktujte a pomůžeme vám situaci vyřešit."
    }
  ];

  const faqProviders = [
    {
      id: "p1",
      question: "Jak se mohu registrovat jako fachman?",
      answer: "Klikněte na 'Registrace', vyberte možnost 'Jsem fachman' a vyplňte registrační formulář. Funkce verifikace profilu je momentálně ve vývoji."
    },
    {
      id: "p2",
      question: "Jak funguje verifikace profilu?",
      answer: "Verifikace profilu je zatím pouze připravovaná funkce. Jakmile ji spustíme, zobrazíme přesný postup i podmínky přímo v aplikaci."
    },
    {
      id: "p3",
      question: "Kolik stojí používání platformy?",
      answer: "Základní účet je zdarma s omezeným počtem nabídek měsíčně. Pro neomezené nabídky a další výhody nabízíme Premium členství. Podrobnosti najdete v ceníku."
    },
    {
      id: "p4",
      question: "Jak získám více zakázek?",
      answer: "Vyplňte kompletně svůj profil, přidejte portfolio prací, sbírejte pozitivní recenze a reagujte na poptávky rychle. Premium členové mají také zvýrazněný profil."
    },
    {
      id: "p5",
      question: "Mohu upravit nebo stáhnout nabídku?",
      answer: "Ano, odeslanou nabídku můžete upravit nebo stáhnout dokud ji zákazník nepřijme."
    },
    {
      id: "p6",
      question: "Jak funguje hodnocení?",
      answer: "Po dokončení zakázky vás zákazník může ohodnotit 1-5 hvězdičkami a napsat recenzi. Vaše průměrné hodnocení se zobrazuje na vašem profilu."
    }
  ];

  const currentFaq = activeTab === "customer" ? faqCustomers : faqProviders;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-cyan-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200/30 rounded-full opacity-30 animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-200/30 rounded-full opacity-30 animate-float animation-delay-200"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              NÁPOVĚDA
            </span>
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Časté dotazy
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Najděte odpovědi na nejčastější otázky o platformě Fachmani
            </p>
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <section className="py-8 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center p-1.5 bg-gray-100 rounded-2xl">
              <button
                onClick={() => { setActiveTab("customer"); setOpenQuestion(null); }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === "customer"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🏠 Pro zákazníky
              </button>
              <button
                onClick={() => { setActiveTab("provider"); setOpenQuestion(null); }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === "provider"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🔧 Pro fachmany
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="space-y-4">
            {currentFaq.map((item, index) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => setOpenQuestion(openQuestion === item.id ? null : item.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                  <span className={`text-cyan-500 transition-transform flex-shrink-0 ${
                    openQuestion === item.id ? 'rotate-180' : ''
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {openQuestion === item.id && (
                  <div className="px-6 pb-5 text-gray-600 border-t border-gray-100 pt-4">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-8 lg:p-12 text-center border border-cyan-100">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nenašli jste odpověď?
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Náš tým podpory vám rád pomůže s jakýmkoliv dotazem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Kontaktovat podporu
                {Icons.arrowRight}
              </Link>
              
                <a href="mailto:podpora@fachmani.cz"
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-semibold hover:border-cyan-200 transition-all"
              >
                📧 podpora@fachmani.cz
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
