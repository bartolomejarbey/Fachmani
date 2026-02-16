"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

export default function JakToFunguje() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
              PRŮVODCE
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Jak Fachmani funguje?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Propojujeme lidi, kteří potřebují služby, s ověřenými fachmany z jejich okolí. Jednoduše, rychle a bezpečně.
            </p>
          </div>
        </div>
      </section>

      {/* Pro zákazníky */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-16 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              PRO ZÁKAZNÍKY
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Potřebujete službu?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tři jednoduché kroky k nalezení perfektního fachmana
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Icons.search,
                title: "Zadejte poptávku",
                description: "Popište co potřebujete, kde a kdy. Přidejte fotky a nastavte rozpočet. Zabere to max 2 minuty.",
                color: "blue"
              },
              {
                step: "02",
                icon: Icons.users,
                title: "Dostanete nabídky",
                description: "Ověření fachmani z vašeho okolí vám pošlou nabídky s cenou a termínem. Poptávka je otevřená 14 dní.",
                color: "emerald"
              },
              {
                step: "03",
                icon: Icons.check,
                title: "Vyberte si a domluvte se",
                description: "Porovnejte nabídky, prohlédněte si profily a recenze. Vyberte fachmana a domluvte detaily přes chat.",
                color: "purple"
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group relative ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {i < 2 && (
                  <div className="hidden lg:block absolute top-20 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                )}
                
                <div className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-transparent transition-all duration-300 hover:-translate-y-2">
                  <span className="absolute -top-4 -left-4 text-7xl font-bold text-gray-100 group-hover:text-blue-100 transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                    item.color === "blue" ? "bg-blue-100 text-blue-600" :
                    item.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                    "bg-purple-100 text-purple-600"
                  } group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all"
            >
              Zadat poptávku zdarma
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* Pro fachmany */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-16 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
              PRO FACHMANY
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Jste profesionál?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Získejte nové zakázky bez námahy
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Icons.users,
                title: "Vytvořte si profil",
                description: "Zaregistrujte se, vyplňte profil a ověřte svou identitu přes BankID. Budete tak důvěryhodnější pro zákazníky.",
                color: "emerald"
              },
              {
                step: "02",
                icon: Icons.search,
                title: "Prohlížejte poptávky",
                description: "Najděte poptávky ve vašem oboru a okolí. Filtrujte podle kategorie, lokality nebo rozpočtu.",
                color: "blue"
              },
              {
                step: "03",
                icon: Icons.briefcase,
                title: "Posílejte nabídky",
                description: "Pošlete nabídku s vaší cenou a termínem. Komunikujte se zákazníkem a získejte zakázku.",
                color: "purple"
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group relative ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {i < 2 && (
                  <div className="hidden lg:block absolute top-20 left-[60%] w-[80%] border-t-2 border-dashed border-gray-300"></div>
                )}
                
                <div className="relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <span className="absolute -top-4 -left-4 text-7xl font-bold text-gray-100 group-hover:text-emerald-100 transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                    item.color === "blue" ? "bg-blue-100 text-blue-600" :
                    item.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                    "bg-purple-100 text-purple-600"
                  } group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/auth/register?role=provider"
              className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-emerald-600 hover:shadow-xl hover:scale-105 transition-all"
            >
              Registrovat se jako fachman
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* Výhody */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white/10 text-white text-sm font-semibold rounded-full mb-4">
              VÝHODY
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Proč používat Fachmani?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Icons.shield, title: "Ověření fachmani", desc: "Všichni fachmani prochází ověřením identity přes BankID." },
              { icon: Icons.location, title: "Lokální služby", desc: "Najděte odborníky přímo ve vašem okolí." },
              { icon: Icons.star, title: "Hodnocení a recenze", desc: "Vybírejte podle reálných zkušeností ostatních." },
              { icon: Icons.chat, title: "Bezpečná komunikace", desc: "Vše si domluvíte přes náš interní chat." },
            ].map((item, i) => (
              <div 
                key={i} 
                className={`text-center group ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-bg"></div>
            <div className="absolute inset-0 bg-black/10"></div>
            
            <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                Připraveni začít?
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Přidejte se k tisícům spokojených uživatelů
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/nova-poptavka"
                  className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
                >
                  Zadat poptávku
                  {Icons.arrowRight}
                </Link>
                <Link
                  href="/auth/register?role=provider"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                >
                  Jsem fachman
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}