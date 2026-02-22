"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const recentRequests = [
  { id: 1, title: "Rekonstrukce koupelny", location: "Praha 5", budget: "45 000 Kč", time: "před 3 min", category: "🔧", offers: 2 },
  { id: 2, title: "Tvorba webových stránek", location: "Brno", budget: "35 000 Kč", time: "před 8 min", category: "💻", offers: 4 },
  { id: 3, title: "Malování bytu 2+1", location: "Ostrava", budget: "12 000 Kč", time: "před 15 min", category: "🎨", offers: 3 },
  { id: 4, title: "Hlídání dětí o víkendu", location: "Praha 3", budget: "2 500 Kč", time: "před 24 min", category: "👶", offers: 5 },
  { id: 5, title: "SEO optimalizace e-shopu", location: "Online", budget: "15 000 Kč", time: "před 31 min", category: "📈", offers: 2 },
  { id: 6, title: "Montáž klimatizace", location: "Hradec Králové", budget: "35 000 Kč", time: "před 45 min", category: "❄️", offers: 3 },
];

const avatarEmojis = ["👨‍🔧", "👩‍🔧", "👨‍🎨", "👷", "👩‍💻", "👨‍🏫"];

const categories = [
  { icon: "🔧", name: "Instalatér", slug: "instalater", count: 34 },
  { icon: "⚡", name: "Elektrikář", slug: "elektrikar", count: 28 },
  { icon: "🎨", name: "Malíř", slug: "malir", count: 19 },
  { icon: "🪚", name: "Truhlář", slug: "truhlar", count: 15 },
  { icon: "💻", name: "Web & IT", slug: "web-it", count: 52 },
  { icon: "📈", name: "Marketing", slug: "marketing", count: 38 },
  { icon: "👶", name: "Hlídání dětí", slug: "hlidani-deti", count: 45 },
  { icon: "🐕", name: "Péče o zvířata", slug: "pece-o-zvirata", count: 23 },
  { icon: "✨", name: "Úklid", slug: "uklid", count: 67 },
  { icon: "🏠", name: "Rekonstrukce", slug: "rekonstrukce", count: 31 },
  { icon: "📦", name: "Stěhování", slug: "stehovani", count: 18 },
  { icon: "📸", name: "Foto & Video", slug: "foto-video", count: 42 },
  { icon: "🎓", name: "Doučování", slug: "doucovani", count: 56 },
  { icon: "💪", name: "Fitness trenér", slug: "fitness", count: 29 },
  { icon: "🌿", name: "Zahradník", slug: "zahradnik", count: 21 },
  { icon: "🚗", name: "Autoservis", slug: "autoservis", count: 33 },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % recentRequests.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + recentRequests.length) % recentRequests.length);

  return (
    <div className="min-h-screen bg-white" style={{ overflowX: "hidden", width: "100%" }}>
      <Navbar />

      {/* ==================== HERO ==================== */}
      <section className="relative bg-gradient-to-br from-cyan-50 via-white to-blue-50" style={{ paddingTop: "100px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            
            {/* LEFT - Text */}
            <div className="text-center lg:text-left mb-10 lg:mb-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white shadow-md px-3 py-1.5 rounded-full mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-gray-600">
                  <strong className="text-emerald-600">23</strong> aktivních poptávek
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4" style={{ lineHeight: "1.2" }}>
                Najděte{" "}
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  profesionála
                </span>
                <br />
                <span className="text-gray-400">na cokoliv</span>
              </h1>

              {/* Desc */}
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 max-w-md mx-auto lg:mx-0">
                Od řemeslníků po marketing, IT až po hlídání dětí. Získejte nabídky do 24 hodin.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                <Link
                  href="/nova-poptavka"
                  className="block sm:inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold text-center shadow-lg"
                >
                  Zadat poptávku zdarma
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="block sm:inline-block bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Jak to funguje
                </Link>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs">
                  ✓ Ověření
                </span>
                <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full text-xs">
                  ⚡ Do 24h
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                  🛡️ Zdarma
                </span>
              </div>

              {/* Trust */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {avatarEmojis.slice(0, 4).map((emoji, i) => (
                      <div key={i} className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 border-2 border-white flex items-center justify-center text-xs lg:text-sm">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs lg:text-sm text-gray-600">
                    <strong>580+</strong> profesionálů
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-xs lg:text-sm text-gray-600">
                    <strong>4.8</strong>/5
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT - Carousel (desktop only) */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                      <span className="text-white font-semibold">Nové poptávky</span>
                    </div>
                    <span className="text-white/80 text-sm">{currentSlide + 1} / {recentRequests.length}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="overflow-hidden">
                    <div 
                      className="flex transition-transform duration-300"
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
                            <div className="flex flex-wrap gap-2">
                              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                📍 {req.location}
                              </span>
                              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
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

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
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
                    <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 flex items-center justify-center transition-colors">
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Features under card */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-lg">✓</div>
                  <div>
                    <p className="text-xs text-gray-400">Ověření</p>
                    <p className="font-semibold text-gray-900 text-sm">BankID</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-lg">⚡</div>
                  <div>
                    <p className="text-xs text-gray-400">Odpověď</p>
                    <p className="font-semibold text-gray-900 text-sm">Do 24 hodin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      <section className="py-6 lg:py-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
            {[
              { value: "580+", label: "Profesionálů" },
              { value: "23", label: "Aktivních poptávek" },
              { value: "1 250+", label: "Dokončených zakázek" },
              { value: "4.8/5", label: "Průměrné hodnocení" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== JAK TO FUNGUJE ==================== */}
      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Jak to funguje?
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Tři jednoduché kroky k nalezení profesionála
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 lg:gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", icon: "🔍", title: "Zadejte poptávku", desc: "Popište co potřebujete a zadejte lokalitu", color: "bg-cyan-100" },
              { step: "02", icon: "📋", title: "Porovnejte nabídky", desc: "Profesionálové vám pošlou své nabídky", color: "bg-blue-100" },
              { step: "03", icon: "✓", title: "Vyberte a realizujte", desc: "Vyberte nejlepší nabídku a sledujte práci", color: "bg-emerald-100" },
            ].map((item, i) => (
              <div key={i} className="relative bg-white rounded-xl p-5 lg:p-6 border border-gray-100 shadow-sm">
                <span className="absolute -top-2 -left-2 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                  {item.step}
                </span>
                <div className={`w-12 h-12 lg:w-14 lg:h-14 ${item.color} rounded-xl flex items-center justify-center mb-4 text-xl lg:text-2xl`}>
                  {item.icon}
                </div>
                <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 lg:mt-12">
            <Link
              href="/nova-poptavka"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl text-sm lg:text-base font-semibold shadow-lg"
            >
              Vyzkoušet zdarma →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== KATEGORIE ==================== */}
      <section className="py-12 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 lg:mb-12">
            <div>
              <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                KATEGORIE
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-600 font-semibold text-sm hover:text-cyan-700">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {categories.map((cat, i) => (
              <Link
                key={i}
                href={`/kategorie/${cat.slug}`}
                className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all"
              >
                <div className="text-2xl lg:text-3xl mb-2">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm lg:text-base">{cat.name}</h3>
                <p className="text-xs lg:text-sm text-gray-500">{cat.count} profesionálů</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PROČ MY ==================== */}
      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-16">
            <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              PROČ FACHMANI
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Proč si vybrat nás?
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 max-w-4xl mx-auto">
            {[
              { icon: "🛡️", title: "Ověření profesionálové", desc: "Každý prochází ověřením přes BankID" },
              { icon: "⭐", title: "Reálné recenze", desc: "Hodnocení od skutečných zákazníků" },
              { icon: "⚡", title: "Rychlé nabídky", desc: "Průměrně 3 nabídky do 24 hodin" },
              { icon: "💬", title: "Bezpečný chat", desc: "Komunikace přímo v aplikaci" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center text-xl lg:text-2xl">
                  {item.icon}
                </div>
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs lg:text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRO PROFESIONÁLY ==================== */}
      <section className="py-12 lg:py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="text-center lg:text-left mb-8 lg:mb-0">
              <span className="inline-block bg-white/10 text-cyan-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                PRO PROFESIONÁLY
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
                Jste profesionál?
                <br />
                <span className="text-cyan-400">Získejte nové zakázky</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-300 mb-6 max-w-md mx-auto lg:mx-0">
                Připojte se k síti profesionálů a nechte zákazníky, ať najdou právě vás.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/auth/register?role=provider"
                  className="block sm:inline-block bg-white text-gray-900 px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Registrovat se zdarma
                </Link>
                <Link
                  href="/cenik"
                  className="block sm:inline-block border border-white/30 text-white px-6 py-3 rounded-xl text-sm font-semibold text-center"
                >
                  Zobrazit ceník
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {[
                { value: "0 Kč", label: "Registrace zdarma" },
                { value: "3×", label: "Nabídky měsíčně zdarma" },
                { value: "24h", label: "Průměrná odezva" },
                { value: "98%", label: "Spokojených klientů" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs lg:text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-12 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            Připraveni začít?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-8">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených profesionálů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 lg:px-10 py-4 lg:py-5 rounded-xl text-base lg:text-lg font-semibold shadow-lg"
          >
            Zadat poptávku zdarma →
          </Link>
          
          <p className="text-gray-500 mt-4 text-xs lg:text-sm">
            100% zdarma pro zákazníky • Žádné skryté poplatky
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}