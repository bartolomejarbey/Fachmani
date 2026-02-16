"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

export default function Cenik() {
  const [mounted, setMounted] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const plans = [
    {
      name: "Start",
      description: "Pro začínající fachmany",
      price: "Zdarma",
      priceAnnual: "Zdarma",
      color: "gray",
      features: [
        { text: "3 nabídky měsíčně", included: true },
        { text: "Základní profil", included: true },
        { text: "Přístup k poptávkám", included: true },
        { text: "Interní chat", included: true },
        { text: "Zvýrazněný profil", included: false },
        { text: "Prioritní zobrazení", included: false },
        { text: "Statistiky a analytika", included: false },
      ],
      cta: "Začít zdarma",
      href: "/auth/register?role=provider",
      popular: false
    },
    {
      name: "Premium",
      description: "Pro aktivní fachmany",
      price: "499 Kč",
      priceAnnual: "415 Kč",
      color: "blue",
      features: [
        { text: "Neomezené nabídky", included: true },
        { text: "Rozšířený profil + portfolio", included: true },
        { text: "Přístup k poptávkám", included: true },
        { text: "Interní chat", included: true },
        { text: "Zvýrazněný profil", included: true },
        { text: "Prioritní zobrazení", included: true },
        { text: "Základní statistiky", included: true },
      ],
      cta: "Vyzkoušet Premium",
      href: "/auth/register?role=provider&plan=premium",
      popular: true
    },
    {
      name: "Business",
      description: "Pro firmy a týmy",
      price: "1 299 Kč",
      priceAnnual: "1 082 Kč",
      color: "purple",
      features: [
        { text: "Vše z Premium", included: true },
        { text: "Firemní profil", included: true },
        { text: "Více uživatelů (až 5)", included: true },
        { text: "Pokročilá analytika", included: true },
        { text: "API přístup", included: true },
        { text: "Prioritní podpora", included: true },
        { text: "Vlastní branding", included: true },
      ],
      cta: "Kontaktovat obchod",
      href: "/kontakt?subject=business",
      popular: false
    }
  ];

  const faqs = [
    {
      question: "Mohu kdykoli změnit plán?",
      answer: "Ano, plán můžete upgradovat nebo downgradovat kdykoli. Při upgradu se změna projeví okamžitě, při downgradu na konci fakturačního období."
    },
    {
      question: "Jak funguje platba?",
      answer: "Platba probíhá měsíčně kartou nebo bankovním převodem. Fakturu dostanete emailem vždy na začátku období."
    },
    {
      question: "Co se stane když překročím limit nabídek?",
      answer: "U Start plánu po vyčerpání 3 nabídek nemůžete odesílat další až do dalšího měsíce. Doporučujeme upgrade na Premium pro neomezené nabídky."
    },
    {
      question: "Nabízíte slevy pro roční předplatné?",
      answer: "Ano! Při roční platbě získáte 2 měsíce zdarma. To je sleva 17% oproti měsíční platbě."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              CENÍK
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Jednoduchý a férový ceník
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Vyberte si plán, který vám vyhovuje. Začněte zdarma a upgradujte kdykoli.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 bg-gray-100 p-2 rounded-2xl">
              <button
                onClick={() => setAnnual(false)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  !annual ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Měsíčně
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  annual ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Ročně
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">-17%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                } ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/30 scale-105 lg:scale-110' 
                    : 'bg-white border border-gray-200 hover:shadow-xl'
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-400 text-emerald-900 px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      Nejoblíbenější
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-6 ${plan.popular ? 'text-blue-100' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-end justify-center gap-1">
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      {annual ? plan.priceAnnual : plan.price}
                    </span>
                    {plan.price !== "Zdarma" && (
                      <span className={`text-lg mb-2 ${plan.popular ? 'text-blue-200' : 'text-gray-500'}`}>
                        /měsíc
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        feature.included 
                          ? plan.popular ? 'bg-emerald-400 text-emerald-900' : 'bg-emerald-100 text-emerald-600'
                          : plan.popular ? 'bg-blue-500/50 text-blue-300' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {feature.included ? Icons.check : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`${
                        feature.included 
                          ? plan.popular ? 'text-white' : 'text-gray-700'
                          : plan.popular ? 'text-blue-300' : 'text-gray-400'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full py-4 rounded-2xl font-semibold text-center transition-all hover:scale-105 ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:shadow-xl' 
                      : plan.color === 'purple'
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features comparison */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Co je zahrnuto?
            </h2>
            <p className="text-xl text-gray-600">
              Detailní přehled všech funkcí
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Icons.briefcase,
                title: "Neomezené nabídky",
                description: "S Premium plánem můžete odesílat neomezený počet nabídek na poptávky."
              },
              {
                icon: Icons.star,
                title: "Zvýrazněný profil",
                description: "Váš profil bude označen jako Premium a zobrazí se výše ve výsledcích."
              },
              {
                icon: Icons.lightning,
                title: "Prioritní zobrazení",
                description: "Vaše nabídky se zobrazí zákazníkům jako první."
              },
              {
                icon: Icons.chart,
                title: "Statistiky",
                description: "Sledujte úspěšnost svých nabídek a optimalizujte svůj profil."
              },
              {
                icon: Icons.shield,
                title: "Ověřený účet",
                description: "Badge ověřeného fachmana zvyšuje důvěru zákazníků."
              },
              {
                icon: Icons.chat,
                title: "Prioritní podpora",
                description: "Business plán zahrnuje přednostní zákaznickou podporu."
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-2xl p-6 hover:shadow-lg transition-all ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full mb-4">
              FAQ
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Časté dotazy k cenám
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details 
                key={i} 
                className={`group bg-gray-50 rounded-2xl overflow-hidden ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <summary className="px-6 py-5 cursor-pointer font-semibold text-gray-900 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  {faq.question}
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="px-6 pb-5 text-gray-600">
                  {faq.answer}
                </p>
              </details>
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
            
            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Začněte získávat zakázky ještě dnes
              </h2>
              <p className="text-xl text-white/80 mb-8">
                Registrace je zdarma. Žádná kreditní karta.
              </p>
              <Link
                href="/auth/register?role=provider"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
              >
                Zaregistrovat se zdarma
                {Icons.arrowRight}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}