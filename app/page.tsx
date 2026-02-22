"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Icons } from "./components/Icons";

// Fiktivní poptávky - realistická data
const recentRequests = [
  { id: 1, title: "Rekonstrukce koupelny", location: "Praha 5", budget: "45 000 Kč", time: "před 3 min", category: "🔧", offers: 2 },
  { id: 2, title: "Elektroinstalace v bytě", location: "Brno", budget: "22 000 Kč", time: "před 8 min", category: "⚡", offers: 4 },
  { id: 3, title: "Malování bytu 2+1", location: "Ostrava", budget: "12 000 Kč", time: "před 15 min", category: "🎨", offers: 3 },
  { id: 4, title: "Pokládka plovoucí podlahy", location: "Plzeň", budget: "18 000 Kč", time: "před 24 min", category: "🏠", offers: 1 },
  { id: 5, title: "Oprava okapů", location: "Liberec", budget: "8 500 Kč", time: "před 31 min", category: "🏗️", offers: 2 },
  { id: 6, title: "Montáž klimatizace", location: "Hradec Králové", budget: "35 000 Kč", time: "před 45 min", category: "❄️", offers: 5 },
];

// Náhodné avatary pro fachmany
const avatarEmojis = ["👨‍🔧", "👩‍🔧", "👨‍🎨", "👷", "👨‍💼", "👩‍💼", "🧑‍🔧", "👨‍🏭"];

// Realistické statistiky
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

  // Get random avatars for display
  const getRandomAvatars = (count: number) => {
    const shuffled = [...avatarEmojis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const displayAvatars = getRandomAvatars(4);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navbar />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center pt-20 lg:pt-0">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-cyan-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Left content */}
            <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white shadow-md px-4 py-2 rounded-full mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-gray-600">
                  <span className="text-emerald-600 font-bold">{stats.requests}</span> aktivních poptávek
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Najděte
                <span className="relative inline-block mx-2">
                  <span className="gradient-text">fachmana</span>
                  <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none">
                    <path d="M1 4C50 1 150 1 199 4" stroke="url(#underline)" strokeWidth="3" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="underline" x1="1" y1="3" x2="199" y2="3">
                        <stop stopColor="#06b6d4"/>
                        <stop offset="1" stopColor="#3b82f6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <br />
                <span className="text-gray-400">pro jakoukoliv práci</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg">
                Spojíme vás s ověřenými odborníky ve vašem okolí. 
                Získejte nabídky <span className="text-cyan-600 font-semibold">do 24 hodin</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/nova-poptavka"
                  className="group inline-flex items-center justify-center gap-2 gradient-bg text-white px-6 sm:px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all"
                >
                  Zadat poptávku zdarma
                  <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="group inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-6 sm:px-8 py-4 rounded-2xl text-lg font-semibold hover:border-cyan-200 hover:bg-cyan-50 transition-all"
                >
                  Jak to funguje
                </Link>
              </div>

              {/* 3 Opening Arguments / Štítky */}
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="text-emerald-500">{Icons.check}</span>
                  Ověření přes BankID
                </div>
                <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="text-cyan-500">{Icons.lightning}</span>
                  Nabídky do 24 hodin
                </div>
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="text-blue-500">{Icons.shield}</span>
                  100% zdarma
                </div>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {displayAvatars.map((emoji, i) => (
                      <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white flex items-center justify-center text-lg shadow-sm">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{stats.fachmans}</strong> fachmanů
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="text-sm">{Icons.star}</span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{stats.rating}</strong> hodnocení
                  </span>
                </div>
              </div>
            </div>

            {/* Right content - Request Carousel */}
            <div className={`relative ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              <div className="relative max-w-md mx-auto lg:max-w-none">
                
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
                              {/* Category & Time */}
                              <div className="flex items-center justify-between">
                                <span className="text-3xl">{req.category}</span>
                                <span className="text-sm text-gray-400">{req.time}</span>
                              </div>

                              {/* Title */}
                              <h3 className="text-xl font-bold text-gray-900">{req.title}</h3>

                              {/* Details */}
                              <div className="flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  <span className="text-cyan-500">{Icons.location}</span>
                                  {req.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  <span className="text-emerald-500">{Icons.briefcase}</span>
                                  {req.budget}
                                </span>
                              </div>

                              {/* Offers count */}
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

                    {/* Navigation Arrows */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <button 
                        onClick={prevSlide}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors"
                        aria-label="Předchozí"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      {/* Dots */}
                      <div className="flex gap-2">
                        {recentRequests.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              i === currentSlide 
                                ? 'bg-cyan-500 w-6' 
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            aria-label={`Poptávka ${i + 1}`}
                          />
                        ))}
                      </div>

                      <button 
                        onClick={nextSlide}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors"
                        aria-label="Další"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features UNDER the card - not floating over */}
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
      <section className="py-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: stats.fachmans, label: "Ověřených fachmanů", suffix: "+" },
              { value: stats.requests, label: "Aktivních poptávek", suffix: "" },
              { value: stats.completed, label: "Dokončených zakázek", suffix: "+" },
              { value: stats.rating, label: "Průměrné hodnocení", suffix: "/5" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Jak to funguje?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tři jednoduché kroky k nalezení perfektního profesionála
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
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
                {/* Connection line - desktop only */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200"></div>
                )}
                
                <div className="relative bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all duration-300 hover:-translate-y-1">
                  <span className="absolute -top-3 -left-3 w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                    item.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                    item.color === "blue" ? "bg-blue-100 text-blue-600" :
                    "bg-emerald-100 text-emerald-600"
                  }`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10 lg:mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Vyzkoušet zdarma
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 lg:mb-12">
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                KATEGORIE
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-600 font-semibold hover:text-cyan-700 mt-4 sm:mt-0">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                className="group bg-white rounded-2xl p-5 lg:p-6 border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-3xl lg:text-4xl mb-3">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.count} fachmanů</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY US ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              PROČ FACHMANI
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Proč si vybrat nás?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Spojujeme kvalitu, bezpečnost a jednoduchost
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { icon: Icons.shield, title: "Ověření fachmani", desc: "Každý prochází ověřením identity přes BankID", color: "cyan" },
              { icon: Icons.star, title: "Reálné recenze", desc: "Hodnocení pouze od zákazníků, kteří službu využili", color: "yellow" },
              { icon: Icons.lightning, title: "Rychlé nabídky", desc: "Průměrně 3 nabídky do 24 hodin", color: "blue" },
              { icon: Icons.chat, title: "Bezpečný chat", desc: "Komunikace přímo v aplikaci", color: "emerald" },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center ${
                  item.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                  item.color === "yellow" ? "bg-yellow-100 text-yellow-600" :
                  item.color === "blue" ? "bg-blue-100 text-blue-600" :
                  "bg-emerald-100 text-emerald-600"
                }`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR PROVIDERS CTA ==================== */}
      <section className="py-16 lg:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-white/10 text-cyan-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                PRO PROFESIONÁLY
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Jste fachman?
                <br />
                <span className="text-cyan-400">Získejte nové zakázky</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Připojte se k síti profesionálů a nechte zákazníky, 
                ať najdou právě vás. Začněte zdarma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/register?role=provider"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all"
                >
                  Registrovat se zdarma
                  {Icons.arrowRight}
                </Link>
                <Link
                  href="/cenik"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                >
                  Zobrazit ceník
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "0 Kč", label: "Registrace" },
                { value: "3×", label: "Nabídky zdarma/měsíc" },
                { value: "24h", label: "Průměrná odezva" },
                { value: "98%", label: "Spokojených klientů" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Připraveni začít?
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených profesionálů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-3 gradient-bg text-white px-10 py-5 rounded-2xl text-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Zadat poptávku zdarma
            {Icons.arrowRight}
          </Link>
          
          <p className="text-gray-500 mt-6 text-sm">
            100% zdarma pro zákazníky • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}