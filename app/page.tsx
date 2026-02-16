"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Icons } from "./components/Icons";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
          
          {/* Floating shapes */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl animate-pulse-slow"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-emerald-100 px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-gray-700">Nový způsob hledání řemeslníků</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                Najděte 
                <span className="relative">
                  <span className="gradient-text"> fachmana </span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M1 5.5C47.6667 2.16667 141 -2.4 199 5.5" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="gradient" x1="1" y1="5" x2="199" y2="5">
                        <stop stopColor="#3b82f6"/>
                        <stop offset="1" stopColor="#10b981"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <br />
                pro jakoukoliv práci
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-lg">
                Spojíme vás s ověřenými profesionály ve vašem okolí. 
                Získejte nabídky do 24 hodin.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/nova-poptavka"
                  className="group inline-flex items-center justify-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300"
                >
                  Zadat poptávku
                  <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="group inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-200 transition-all duration-300"
                >
                  <span className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {Icons.play}
                  </span>
                  Jak to funguje
                </Link>
              </div>

              {/* Stats inline */}
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 border-2 border-white"></div>
                    ))}
                  </div>
                  <span className="text-gray-600"><strong className="text-gray-900">500+</strong> fachmanů</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  {Icons.star}{Icons.star}{Icons.star}{Icons.star}{Icons.star}
                  <span className="text-gray-600 ml-1"><strong className="text-gray-900">4.9</strong> hodnocení</span>
                </div>
              </div>
            </div>

            {/* Right content - Visual */}
            <div className={`relative ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              {/* Main card */}
              <div className="relative">
                <div className="absolute inset-0 gradient-bg rounded-3xl blur-2xl opacity-20 scale-105"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-medium text-gray-500">Nová poptávka</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">AKTIVNÍ</span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Rekonstrukce koupelny</h3>
                  <p className="text-gray-600 mb-4">Kompletní rekonstrukce koupelny 6m², včetně obkladů a instalatérských prací.</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <span className="flex items-center gap-1">
                      <span className="text-blue-500">{Icons.location}</span>
                      Praha 5
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-500">{Icons.briefcase}</span>
                      50-80 000 Kč
                    </span>
                  </div>

                  {/* Offers */}
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-3">3 nabídky od fachmanů:</p>
                    <div className="space-y-2">
                      {[
                        { name: "Jan N.", price: "65 000 Kč", rating: 4.9 },
                        { name: "Petr K.", price: "72 000 Kč", rating: 4.8 },
                        { name: "Martin S.", price: "58 000 Kč", rating: 4.7 },
                      ].map((offer, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                              {offer.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{offer.name}</p>
                              <div className="flex items-center gap-1 text-xs text-yellow-500">
                                {Icons.star}
                                <span className="text-gray-500">{offer.rating}</span>
                              </div>
                            </div>
                          </div>
                          <span className="font-semibold text-gray-900">{offer.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    {Icons.check}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ověřeno</p>
                    <p className="font-semibold text-gray-900">BankID</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl p-4 animate-float animation-delay-300">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    {Icons.lightning}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Průměrná doba</p>
                    <p className="font-semibold text-gray-900">Do 24 hodin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-gray-500 mb-8">Důvěřují nám tisíce spokojených zákazníků</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
            {["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc"].map(city => (
              <span key={city} className="text-xl font-bold text-gray-400">{city}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Jak to funguje?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tři jednoduché kroky k nalezení perfektního fachmana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Icons.search,
                title: "Zadejte poptávku",
                description: "Popište co potřebujete, přidejte fotky a nastavte rozpočet. Zabere to 2 minuty.",
                color: "blue"
              },
              {
                step: "02",
                icon: Icons.users,
                title: "Porovnejte nabídky",
                description: "Fachmani vám pošlou cenové nabídky. Prohlédněte si jejich profily a hodnocení.",
                color: "emerald"
              },
              {
                step: "03",
                icon: Icons.check,
                title: "Vyberte a realizujte",
                description: "Vyberte nejlepší nabídku, domluvte detaily a sledujte průběh práce.",
                color: "purple"
              }
            ].map((item, i) => (
              <div key={i} className="group relative">
                {/* Connection line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                )}
                
                <div className="relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <span className="absolute -top-4 -left-4 text-6xl font-bold text-gray-100 group-hover:text-blue-100 transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    item.color === "blue" ? "bg-blue-100 text-blue-600" :
                    item.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                    "bg-purple-100 text-purple-600"
                  } group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-xl transition-all"
            >
              Vyzkoušet zdarma
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-4">
                KATEGORIE
              </span>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-blue-600 font-semibold hover:text-blue-700 mt-4 md:mt-0">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Icons.wrench, name: "Instalatér", count: 124, color: "from-blue-500 to-blue-600" },
              { icon: Icons.bolt, name: "Elektrikář", count: 89, color: "from-yellow-500 to-orange-500" },
              { icon: Icons.paint, name: "Malíř", count: 67, color: "from-pink-500 to-rose-500" },
              { icon: Icons.hammer, name: "Truhlář", count: 45, color: "from-amber-500 to-amber-600" },
              { icon: Icons.sparkles, name: "Úklid", count: 156, color: "from-cyan-500 to-teal-500" },
              { icon: Icons.home, name: "Rekonstrukce", count: 78, color: "from-indigo-500 to-purple-500" },
              { icon: Icons.truck, name: "Stěhování", count: 34, color: "from-gray-500 to-gray-600" },
              { icon: Icons.computer, name: "IT & Tech", count: 92, color: "from-violet-500 to-purple-600" },
            ].map((cat, i) => (
              <Link
                key={i}
                href={`/kategorie`}
                className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-600 group-hover:bg-white/20 group-hover:text-white transition-all">
                    {cat.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-white transition-colors">{cat.name}</h3>
                  <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors">{cat.count} fachmanů</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white/10 text-white text-sm font-semibold rounded-full mb-4">
              PROČ FACHMANI
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Proč si vybrat právě nás?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Spojujeme kvalitu, bezpečnost a jednoduchost
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Icons.shield, title: "Ověření fachmani", desc: "Každý fachman prochází ověřením identity přes BankID" },
              { icon: Icons.star, title: "Reálné recenze", desc: "Hodnocení pouze od zákazníků, kteří službu využili" },
              { icon: Icons.lightning, title: "Rychlé nabídky", desc: "Průměrně 3 nabídky do 24 hodin" },
              { icon: Icons.chat, title: "Bezpečný chat", desc: "Komunikace přímo v aplikaci bez sdílení kontaktů" },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR PROVIDERS CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-bg"></div>
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>

            <div className="relative z-10 px-8 py-16 md:px-16 md:py-24">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                    Jste fachman?
                    <br />
                    <span className="text-emerald-300">Získejte zakázky</span>
                  </h2>
                  <p className="text-xl text-white/80 mb-8">
                    Připojte se k síti profesionálů a nechte zákazníky, 
                    ať najdou právě vás. První měsíc zdarma.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/auth/register?role=provider"
                      className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
                    >
                      Začít zdarma
                      {Icons.arrowRight}
                    </Link>
                    <Link
                      href="/cenik"
                      className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                    >
                      Zobrazit ceník
                    </Link>
                  </div>
                </div>

                <div className="hidden md:grid grid-cols-2 gap-4">
                  {[
                    { value: "0 Kč", label: "Registrace" },
                    { value: "3", label: "Nabídky/měsíc zdarma" },
                    { value: "24h", label: "Průměr odpovědi" },
                    { value: "98%", label: "Spokojených" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-white/70">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Připraveni začít?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených fachmanů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-3 gradient-bg text-white px-10 py-5 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300"
          >
            Zadat poptávku zdarma
            {Icons.arrowRight}
          </Link>
          
          <p className="text-gray-500 mt-6">
            100% zdarma pro zákazníky • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}