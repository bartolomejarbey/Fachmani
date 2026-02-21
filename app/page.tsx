"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Icons } from "./components/Icons";

// Fiktivní poptávky pro ticker
const tickerRequests = [
  { id: 1, title: "Rekonstrukce koupelny", location: "Praha 5", budget: "80 000 Kč", time: "před 2 min", category: "🔧" },
  { id: 2, title: "Elektroinstalace v RD", location: "Brno", budget: "45 000 Kč", time: "před 5 min", category: "⚡" },
  { id: 3, title: "Malování bytu 3+1", location: "Ostrava", budget: "25 000 Kč", time: "před 8 min", category: "🎨" },
  { id: 4, title: "Pokládka podlahy", location: "Plzeň", budget: "35 000 Kč", time: "před 12 min", category: "🏠" },
  { id: 5, title: "Oprava střechy", location: "Liberec", budget: "120 000 Kč", time: "před 15 min", category: "🏗️" },
  { id: 6, title: "Instalace klimatizace", location: "Hradec Králové", budget: "55 000 Kč", time: "před 18 min", category: "❄️" },
  { id: 7, title: "Výroba kuchyňské linky", location: "Olomouc", budget: "95 000 Kč", time: "před 22 min", category: "🪚" },
  { id: 8, title: "Zahradnické práce", location: "České Budějovice", budget: "18 000 Kč", time: "před 25 min", category: "🌳" },
  { id: 9, title: "Stěhování bytu", location: "Pardubice", budget: "12 000 Kč", time: "před 28 min", category: "📦" },
  { id: 10, title: "IT podpora pro firmu", location: "Praha 1", budget: "30 000 Kč", time: "před 32 min", category: "💻" },
  { id: 11, title: "Revize elektro", location: "Zlín", budget: "8 000 Kč", time: "před 35 min", category: "⚡" },
  { id: 12, title: "Čištění fasády", location: "Jihlava", budget: "42 000 Kč", time: "před 40 min", category: "🧹" },
];

// Statistiky
const liveStats = {
  activeFachmans: 1247,
  activeRequests: 89,
  completedToday: 34,
  avgResponseTime: "2.4h"
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Rotace statistik
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Navbar />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Animated background */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-200"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse-slow animation-delay-400"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          {/* Gradient line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              {/* Live badge */}
              <div className="inline-flex items-center gap-3 glass px-4 py-2 rounded-full mb-8">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-gray-300">
                  <span className="text-emerald-400 font-bold">{liveStats.activeRequests}</span> aktivních poptávek právě teď
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
                Najděte 
                <span className="relative inline-block mx-3">
                  <span className="gradient-text">fachmana</span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M1 5.5C47.6667 2.16667 141 -2.4 199 5.5" stroke="url(#hero-gradient)" strokeWidth="3" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="hero-gradient" x1="1" y1="5" x2="199" y2="5">
                        <stop stopColor="#06b6d4"/>
                        <stop offset="0.5" stopColor="#3b82f6"/>
                        <stop offset="1" stopColor="#8b5cf6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <br />
                <span className="text-gray-400">pro jakoukoliv práci</span>
              </h1>

              <p className="text-xl text-gray-400 mb-10 max-w-lg leading-relaxed">
                Spojíme vás s ověřenými profesionály ve vašem okolí. 
                Získejte nabídky <span className="text-cyan-400 font-semibold">do 24 hodin</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/nova-poptavka"
                  className="group btn-premium inline-flex items-center justify-center gap-3 text-white px-8 py-4 rounded-2xl text-lg font-semibold"
                >
                  Zadat poptávku zdarma
                  <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                </Link>
                <Link
                  href="/jak-to-funguje"
                  className="group inline-flex items-center justify-center gap-3 glass text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                >
                  <span className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {Icons.play}
                  </span>
                  Jak to funguje
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-slate-950 flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="text-white font-bold">{liveStats.activeFachmans}+</span>
                    <span className="text-gray-400 ml-1">fachmanů</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(i => (
                      <span key={i}>{Icons.star}</span>
                    ))}
                  </div>
                  <span className="text-white font-bold">4.9</span>
                  <span className="text-gray-400 text-sm">hodnocení</span>
                </div>
              </div>
            </div>

            {/* Right content - Stats Dashboard */}
            <div className={`relative ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl"></div>
                
                {/* Main card */}
                <div className="relative glass-dark rounded-3xl p-8 border border-white/10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Live Dashboard</h3>
                      <p className="text-sm text-gray-400">Aktuální statistiky platformy</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-medium text-emerald-400">LIVE</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {[
                      { value: liveStats.activeFachmans.toLocaleString(), label: "Aktivních fachmanů", icon: Icons.users, color: "cyan" },
                      { value: liveStats.activeRequests, label: "Poptávek právě teď", icon: Icons.briefcase, color: "blue" },
                      { value: liveStats.completedToday, label: "Dokončeno dnes", icon: Icons.check, color: "emerald" },
                      { value: liveStats.avgResponseTime, label: "Průměrná odezva", icon: Icons.lightning, color: "purple" },
                    ].map((stat, i) => (
                      <div 
                        key={i} 
                        className={`stat-card p-4 rounded-2xl bg-white/5 border border-white/10 ${
                          i === currentStat ? 'ring-2 ring-cyan-500/50' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                          stat.color === "cyan" ? "bg-cyan-500/20 text-cyan-400" :
                          stat.color === "blue" ? "bg-blue-500/20 text-blue-400" :
                          stat.color === "emerald" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {stat.icon}
                        </div>
                        <div className="text-2xl font-bold text-white number-highlight">{stat.value}</div>
                        <div className="text-xs text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart placeholder */}
                  <div className="h-20 bg-white/5 rounded-xl flex items-end justify-around px-4 pb-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
                      <div 
                        key={i} 
                        className="w-2 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full transition-all hover:from-cyan-400 hover:to-blue-400"
                        style={{ height: `${h}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 glass rounded-2xl p-4 animate-float border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    {Icons.check}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ověřeno</p>
                    <p className="font-semibold text-white">BankID</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 glass rounded-2xl p-4 animate-float animation-delay-300 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                    {Icons.lightning}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Odpověď do</p>
                    <p className="font-semibold text-white">24 hodin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* ==================== LIVE TICKER ==================== */}
      <section className="py-6 border-y border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="ticker-container">
          <div className="ticker-content animate-ticker">
            {[...tickerRequests, ...tickerRequests].map((req, i) => (
              <div 
                key={i} 
                className="inline-flex items-center gap-4 px-6 py-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="text-2xl">{req.category}</span>
                <div>
                  <p className="font-semibold text-white">{req.title}</p>
                  <p className="text-sm text-gray-400">{req.location} • {req.budget}</p>
                </div>
                <span className="text-xs text-cyan-400 font-medium">{req.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center mb-16 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold rounded-full mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              JEDNODUCHÝ PROCES
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Jak to funguje?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                color: "purple"
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group relative ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Connection line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-white/10"></div>
                )}
                
                <div className="relative glass-dark rounded-3xl p-8 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-2 card-3d">
                  <span className="absolute -top-4 -left-4 text-7xl font-bold text-white/5 group-hover:text-cyan-500/10 transition-colors">
                    {item.step}
                  </span>
                  
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    item.color === "cyan" ? "bg-cyan-500/20 text-cyan-400" :
                    item.color === "blue" ? "bg-blue-500/20 text-blue-400" :
                    "bg-purple-500/20 text-purple-400"
                  } group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/nova-poptavka"
              className="btn-premium inline-flex items-center gap-2 text-white px-8 py-4 rounded-2xl text-lg font-semibold"
            >
              Vyzkoušet zdarma
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex flex-col md:flex-row md:items-end md:justify-between mb-12 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-full mb-4">
                KATEGORIE
              </span>
              <h2 className="text-4xl lg:text-5xl font-bold text-white">
                Co potřebujete?
              </h2>
            </div>
            <Link href="/kategorie" className="text-cyan-400 font-semibold hover:text-cyan-300 mt-4 md:mt-0 transition-colors">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🔧", name: "Instalatér", count: 124, color: "from-cyan-500 to-blue-500" },
              { icon: "⚡", name: "Elektrikář", count: 89, color: "from-yellow-500 to-orange-500" },
              { icon: "🎨", name: "Malíř", count: 67, color: "from-pink-500 to-rose-500" },
              { icon: "🪚", name: "Truhlář", count: 45, color: "from-amber-500 to-amber-600" },
              { icon: "✨", name: "Úklid", count: 156, color: "from-cyan-400 to-teal-500" },
              { icon: "🏠", name: "Rekonstrukce", count: 78, color: "from-indigo-500 to-purple-500" },
              { icon: "📦", name: "Stěhování", count: 34, color: "from-gray-500 to-gray-600" },
              { icon: "💻", name: "IT & Tech", count: 92, color: "from-violet-500 to-purple-600" },
            ].map((cat, i) => (
              <Link
                key={i}
                href={`/kategorie`}
                className={`group relative glass-dark rounded-2xl p-6 border border-white/10 hover:border-transparent transition-all duration-300 hover:-translate-y-1 overflow-hidden ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{cat.icon}</div>
                  <h3 className="font-semibold text-white mb-1">{cat.name}</h3>
                  <p className="text-sm text-gray-400 group-hover:text-white/80 transition-colors">{cat.count} fachmanů</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY US ==================== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-premium"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-full mb-6">
              PROČ FACHMANI
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl glass flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:neon-cyan transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR PROVIDERS CTA ==================== */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 animated-gradient"></div>
            <div className="absolute inset-0 bg-black/30"></div>
            
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
                    <span className="text-cyan-300">Získejte zakázky</span>
                  </h2>
                  <p className="text-xl text-white/80 mb-8">
                    Připojte se k síti profesionálů a nechte zákazníky, 
                    ať najdou právě vás. První měsíc zdarma.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/auth/register?role=provider"
                      className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all shine-effect"
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
                    <div key={i} className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
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

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-slate-950"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Připraveni začít?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených fachmanů.
          </p>
          
          <Link
            href="/nova-poptavka"
            className="btn-premium inline-flex items-center gap-3 text-white px-10 py-5 rounded-2xl text-xl font-semibold animate-glow"
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