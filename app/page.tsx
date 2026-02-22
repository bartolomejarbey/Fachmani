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
    <div className="min-h-screen bg-white w-full max-w-full overflow-x-hidden">
      <Navbar />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-24 pb-12 lg:min-h-screen lg:flex lg:items-center lg:pt-0 lg:pb-0 w-full max-w-full overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            
            {/* Left content */}
            <div className={`text-center lg:text-left w-full ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
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

              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Najděte <span className="gradient-text">fachmana</span>
                <br />
                <span className="text-gray-400">pro jakoukoliv práci</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 max-w-md mx-auto lg:mx-0">
                Spojíme vás s ověřenými odborníky ve vašem okolí. Získejte nabídky do 24 hodin.
              </p>

              {/* CTA Buttons */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:justify-center lg:justify-start mb-6">
                <Link
                  href="/nova-poptavka"
                  className="block w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg text-center"
                >
                  Zadat poptávku zdarma
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="block w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Jak to funguje
                </Link>
              </div>

              {/* Štítky */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs">
                  ✓ BankID
                </span>
                <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full text-xs">
                  ⚡ Do 24h
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                  🛡️ Zdarma
                </span>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {displayAvatars.slice(0, 3).map((emoji, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white flex items-center justify-center text-xs">
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
                <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
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
                                  📍 {req.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  💰 {req.budget}
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

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center">
                        ←
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
                      <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center">
                        →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">✓</div>
                    <div>
                      <p className="text-xs text-gray-400">Ověření</p>
                      <p className="font-semibold text-gray-900 text-sm">BankID</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">⚡</div>
                    <div>
                      <p className="text-xs text-gray-400">Odpověď</p>
                      <p className="font-semibold text-gray-900 text-sm">Do 24h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS BAR ==================== */}
      <section className="py-6 bg-gray-50 border-y border-gray-100 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: stats.fachmans, label: "Fachmanů", suffix: "+" },
              { value: stats.requests, label: "Poptávek", suffix: "" },
              { value: stats.completed, label: "Zakázek", suffix: "+" },
              { value: stats.rating, label: "Hodnocení", suffix: "/5" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-12 sm:py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Jak to funguje?
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Tři jednoduché kroky
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { step: "01", title: "Zadejte poptávku", desc: "Popište co potřebujete", color: "cyan" },
              { step: "02", title: "Porovnejte nabídky", desc: "Vyberte z nabídek fachmanů", color: "blue" },
              { step: "03", title: "Realizujte", desc: "Domluvte detaily a sledujte práci", color: "emerald" },
            ].map((item, i) => (
              <div key={i} className="relative bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <span className="absolute -top-2 -left-2 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                  {item.step}
                </span>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  item.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                  item.color === "blue" ? "bg-blue-100 text-blue-600" :
                  "bg-emerald-100 text-emerald-600"
                }`}>
                  {item.step === "01" ? "🔍" : item.step === "02" ? "📋" : "✓"}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg"
            >
              Vyzkoušet zdarma →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="py-12 sm:py-16 bg-gray-50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                KATEGORIE
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-600 font-semibold text-sm">
              Vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                className="bg-white rounded-xl p-4 border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                <p className="text-xs text-gray-500">{cat.count} fachmanů</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY US ==================== */}
      <section className="py-12 sm:py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              PROČ FACHMANI
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Proč si vybrat nás?
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🛡️", title: "Ověření", desc: "BankID ověření" },
              { icon: "⭐", title: "Recenze", desc: "Reálná hodnocení" },
              { icon: "⚡", title: "Rychlost", desc: "Nabídky do 24h" },
              { icon: "💬", title: "Chat", desc: "Bezpečná komunikace" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR PROVIDERS CTA ==================== */}
      <section className="py-12 sm:py-16 bg-gray-900 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="text-center lg:text-left mb-8 lg:mb-0">
              <span className="inline-block bg-white/10 text-cyan-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                PRO PROFESIONÁLY
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
                Jste fachman?
                <br />
                <span className="text-cyan-400">Získejte zakázky</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-300 mb-6">
                Připojte se k síti profesionálů. Začněte zdarma.
              </p>
              
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:justify-center lg:justify-start">
                <Link
                  href="/auth/register?role=provider"
                  className="block w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Registrovat se zdarma
                </Link>
                <Link
                  href="/cenik"
                  className="block w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 border border-white/30 text-white px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Ceník
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "0 Kč", label: "Registrace" },
                { value: "3×", label: "Nabídky zdarma" },
                { value: "24h", label: "Odezva" },
                { value: "98%", label: "Spokojených" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-12 sm:py-16 w-full">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Připraveni začít?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Zadejte poptávku a získejte nabídky od ověřených profesionálů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-xl text-base font-semibold shadow-lg"
          >
            Zadat poptávku zdarma →
          </Link>
          
          <p className="text-gray-500 mt-4 text-xs">
            100% zdarma • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}