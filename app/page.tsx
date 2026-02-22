"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Icons } from "./components/Icons";

const recentRequests = [
  { id: 1, title: "Rekonstrukce koupelny", location: "Praha 5", budget: "45 000 Kč", time: "před 3 min", category: "🔧", offers: 2 },
  { id: 2, title: "Elektroinstalace v bytě", location: "Brno", budget: "22 000 Kč", time: "před 8 min", category: "⚡", offers: 4 },
  { id: 3, title: "Malování bytu 2+1", location: "Ostrava", budget: "12 000 Kč", time: "před 15 min", category: "🎨", offers: 3 },
  { id: 4, title: "Pokládka plovoucí podlahy", location: "Plzeň", budget: "18 000 Kč", time: "před 24 min", category: "🏠", offers: 1 },
  { id: 5, title: "Oprava okapů", location: "Liberec", budget: "8 500 Kč", time: "před 31 min", category: "🏗️", offers: 2 },
  { id: 6, title: "Montáž klimatizace", location: "Hradec Králové", budget: "35 000 Kč", time: "před 45 min", category: "❄️", offers: 5 },
];

const avatarEmojis = ["👨‍🔧", "👩‍🔧", "👨‍🎨", "👷", "👨‍💼", "👩‍💼", "🧑‍🔧", "👨‍🏭"];

const stats = {
  fachmans: 247,
  requests: 23,
  completed: 156,
  rating: 4.8
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % recentRequests.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + recentRequests.length) % recentRequests.length);
  };

  const getRandomAvatars = (count: number) => {
    const shuffled = [...avatarEmojis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const displayAvatars = getRandomAvatars(4);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-24 pb-12 lg:min-h-screen lg:flex lg:items-center lg:pt-0 lg:pb-0">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
          <div className="hidden lg:block absolute top-20 right-0 w-[500px] h-[500px] bg-cyan-100/50 rounded-full blur-3xl"></div>
          <div className="hidden lg:block absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Left content */}
            <div className={`text-center lg:text-left ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white shadow-md px-3 py-1.5 rounded-full mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-gray-600">
                  <span className="text-emerald-600 font-bold">{stats.requests}</span> aktivních poptávek
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4">
                Najděte{" "}
                <span className="gradient-text">fachmana</span>
                <br />
                <span className="text-gray-400">pro jakoukoliv práci</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-md mx-auto lg:mx-0">
                Spojíme vás s ověřenými odborníky ve vašem okolí. 
                Získejte nabídky <span className="text-cyan-600 font-semibold">do 24 hodin</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                <Link
                  href="/nova-poptavka"
                  className="inline-flex items-center justify-center gap-2 gradient-bg text-white px-6 py-3.5 rounded-xl text-base font-semibold shadow-lg shadow-cyan-500/25"
                >
                  Zadat poptávku zdarma
                  {Icons.arrowRight}
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-6 py-3.5 rounded-xl text-base font-semibold"
                >
                  Jak to funguje
                </Link>
              </div>

              {/* Štítky */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">
                  {Icons.check} Ověření přes BankID
                </div>
                <div className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-full text-xs font-medium">
                  {Icons.lightning} Do 24 hodin
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
                  {Icons.shield} 100% zdarma
                </div>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {displayAvatars.slice(0, 3).map((emoji, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white flex items-center justify-center text-sm">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">
                    <strong>{stats.fachmans}</strong> fachmanů
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-sm">★</span>
                  <span className="text-xs text-gray-600">
                    <strong>{stats.rating}</strong>/5
                  </span>
                </div>
              </div>
            </div>

            {/* Right content - Carousel - POUZE DESKTOP */}
            <div className={`hidden lg:block relative ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              <div className="relative">
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                        </span>
                        <span className="text-white font-semibold">Nové poptávky</span>
                      </div>
                      <span className="text-white/80 text-sm">{currentSlide + 1} / {recentRequests.length}</span>
                    </div>
                  </div>

                  {/* Carousel Content */}
                  <div className="p-6">
                    <div className="overflow-hidden">
                      <div 
                        className="flex transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {recentRequests.map((req) => (
                          <div key={req.id} className="w-full flex-shrink-0">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-3xl">{req.category}</span>
                                <span className="text-sm text-gray-400">{req.time}</span>
                              </div>
                              <h3 className="text-xl font-bold text-gray-900">{req.title}</h3>
                              <div className="flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  {Icons.location} {req.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  {Icons.briefcase} {req.budget}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <div className="flex -space-x-1.5">
                                  {Array(Math.min(req.offers, 3)).fill(0).map((_, j) => (
                                    <div key={j} className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white text-sm flex items-center justify-center">
                                      {avatarEmojis[j]}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {req.offers} {req.offers === 1 ? 'nabídka' : req.offers < 5 ? 'nabídky' : 'nabídek'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex gap-2">
                        {recentRequests.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`h-2 rounded-full transition-all ${i === currentSlide ? 'bg-cyan-500 w-6' : 'bg-gray-200 w-2'}`}
                          />
                        ))}
                      </div>
                      <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features under card */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      {Icons.check}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Ověření identity</p>
                      <p className="font-semibold text-gray-900 text-sm">BankID</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600">
                      {Icons.lightning}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Odpověď do</p>
                      <p className="font-semibold text-gray-900 text-sm">24 hodin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS BAR ==================== */}
      <section className="py-6 sm:py-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {[
              { value: stats.fachmans, label: "Ověřených fachmanů", suffix: "+" },
              { value: stats.requests, label: "Aktivních poptávek", suffix: "" },
              { value: stats.completed, label: "Dokončených zakázek", suffix: "+" },
              { value: stats.rating, label: "Průměrné hodnocení", suffix: "/5" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Jak to funguje?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Tři jednoduché kroky k nalezení perfektního profesionála
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                step: "01",
                icon: Icons.search,
                title: "Zadejte poptávku",
                description: "Popište co potřebujete, přidejte fotky a nastavte rozpočet. Zabere to 2 minuty.",
                color: "cyan"
              },
              {
                step: "02",
                icon: Icons.users,
                title: "Porovnejte nabídky",
                description: "Fachmani vám pošlou cenové nabídky. Prohlédněte si jejich profily a hodnocení.",
                color: "blue"
              },
              {
                step: "03",
                icon: Icons.check,
                title: "Vyberte a realizujte",
                description: "Vyberte nejlepší nabídku, domluvte detaily a sledujte průběh práce.",
                color: "emerald"
              }
            ].map((item, i) => (
              <div key={i} className="group relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                )}
                
                <div className="relative bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all duration-300 hover:-translate-y-1">
                  <span className="absolute -top-2.5 sm:-top-3 -left-2.5 sm:-left-3 w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-gray-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 ${
                    item.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                    item.color === "blue" ? "bg-blue-100 text-blue-600" :
                    "bg-emerald-100 text-emerald-600"
                  }`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{item.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-10 lg:mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Vyzkoušet zdarma
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10 lg:mb-12">
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
                KATEGORIE
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-600 font-semibold hover:text-cyan-700 mt-3 sm:mt-0 text-sm sm:text-base">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: "🔧", name: "Instalatér", count: 34 },
              { icon: "⚡", name: "Elektrikář", count: 28 },
              { icon: "🎨", name: "Malíř", count: 19 },
              { icon: "🪚", name: "Truhlář", count: 15 },
              { icon: "✨", name: "Úklid", count: 42 },
              { icon: "🏠", name: "Rekonstrukce", count: 23 },
              { icon: "📦", name: "Stěhování", count: 12 },
              { icon: "💻", name: "IT & Tech", count: 18 },
            ].map((cat, i) => (
              <Link
                key={i}
                href={`/kategorie/${cat.name.toLowerCase()}`}
                className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors text-sm sm:text-base">{cat.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{cat.count} fachmanů</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY US ==================== */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
              PROČ FACHMANI
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Proč si vybrat nás?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Spojujeme kvalitu, bezpečnost a jednoduchost
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              { icon: Icons.shield, title: "Ověření fachmani", desc: "Každý prochází ověřením identity přes BankID", color: "cyan" },
              { icon: Icons.star, title: "Reálné recenze", desc: "Hodnocení pouze od zákazníků, kteří službu využili", color: "yellow" },
              { icon: Icons.lightning, title: "Rychlé nabídky", desc: "Průměrně 3 nabídky do 24 hodin", color: "blue" },
              { icon: Icons.chat, title: "Bezpečný chat", desc: "Komunikace přímo v aplikaci", color: "emerald" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl hover:bg-gray-50 transition-colors">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-5 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                  item.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                  item.color === "yellow" ? "bg-yellow-100 text-yellow-600" :
                  item.color === "blue" ? "bg-blue-100 text-blue-600" :
                  "bg-emerald-100 text-emerald-600"
                }`}>
                  {item.icon}
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR PROVIDERS CTA ==================== */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 bg-white/10 text-cyan-300 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
                PRO PROFESIONÁLY
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
                Jste fachman?
                <br />
                <span className="text-cyan-400">Získejte nové zakázky</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
                Připojte se k síti profesionálů a nechte zákazníky, 
                ať najdou právě vás. Začněte zdarma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/register?role=provider"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold hover:bg-gray-100 transition-all"
                >
                  Registrovat se zdarma
                  {Icons.arrowRight}
                </Link>
                <Link
                  href="/cenik"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold hover:bg-white/10 transition-all"
                >
                  Zobrazit ceník
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { value: "0 Kč", label: "Registrace" },
                { value: "3×", label: "Nabídky zdarma/měsíc" },
                { value: "24h", label: "Průměrná odezva" },
                { value: "98%", label: "Spokojených klientů" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Připraveni začít?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených profesionálů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-2 sm:gap-3 gradient-bg text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Zadat poptávku zdarma
            {Icons.arrowRight}
          </Link>
          
          <p className="text-gray-500 mt-4 sm:mt-6 text-xs sm:text-sm">
            100% zdarma pro zákazníky • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}