"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AdminLayout from "./components/AdminLayout";

type Stats = {
  totalUsers: number;
  totalProviders: number;
  totalCustomers: number;
  verifiedProviders: number;
  unverifiedProviders: number;
  totalRequests: number;
  activeRequests: number;
  totalOffers: number;
  totalReviews: number;
  totalCategories: number;
  activePromos: number;
  revenue: number;
};

type RecentActivity = {
  id: string;
  action: string;
  admin_name: string;
  target_type: string;
  created_at: string;
  details: any;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProviders: 0,
    totalCustomers: 0,
    verifiedProviders: 0,
    unverifiedProviders: 0,
    totalRequests: 0,
    activeRequests: 0,
    totalOffers: 0,
    totalReviews: 0,
    totalCategories: 0,
    activePromos: 0,
    revenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [
        { count: totalUsers },
        { count: totalProviders },
        { count: totalCustomers },
        { count: verifiedProviders },
        { count: totalRequests },
        { count: activeRequests },
        { count: totalOffers },
        { count: totalReviews },
        { count: totalCategories },
        { count: activePromos },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "provider"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "provider").eq("is_verified", true),
        supabase.from("requests").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("offers").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("promotions").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalProviders: totalProviders || 0,
        totalCustomers: totalCustomers || 0,
        verifiedProviders: verifiedProviders || 0,
        unverifiedProviders: (totalProviders || 0) - (verifiedProviders || 0),
        totalRequests: totalRequests || 0,
        activeRequests: activeRequests || 0,
        totalOffers: totalOffers || 0,
        totalReviews: totalReviews || 0,
        totalCategories: totalCategories || 0,
        activePromos: activePromos || 0,
        revenue: 0,
      });

      // Načteme poslední aktivitu
      const { data: activityData } = await supabase
        .from("admin_activity_log")
        .select(`
          id,
          action,
          target_type,
          created_at,
          details,
          profiles:admin_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (activityData) {
        setRecentActivity(activityData.map(a => ({
          ...a,
          admin_name: (a.profiles as any)?.full_name || "System",
        })));
      }

      setLoading(false);
    }

    loadStats();
  }, []);

  const statCards = [
    { label: "Celkem uživatelů", value: stats.totalUsers, icon: "👥", color: "from-blue-500 to-blue-600", subtext: `${stats.totalCustomers} zákazníků, ${stats.totalProviders} fachmanů` },
    { label: "Ověření fachmani", value: stats.verifiedProviders, icon: "✅", color: "from-emerald-500 to-emerald-600", subtext: `${stats.unverifiedProviders} čeká na ověření`, alert: stats.unverifiedProviders > 0 },
    { label: "Aktivní poptávky", value: stats.activeRequests, icon: "📋", color: "from-cyan-500 to-cyan-600", subtext: `z ${stats.totalRequests} celkem` },
    { label: "Nabídky", value: stats.totalOffers, icon: "💼", color: "from-purple-500 to-purple-600", subtext: `${stats.totalReviews} recenzí` },
    { label: "Kategorie", value: stats.totalCategories, icon: "📁", color: "from-amber-500 to-amber-600", subtext: "aktivních kategorií" },
    { label: "Aktivní promo", value: stats.activePromos, icon: "🚀", color: "from-pink-500 to-pink-600", subtext: "běžících kampaní" },
  ];

  const quickActions = [
    { label: "Ověřit fachmany", href: "/admin/uzivatele?filter=unverified", icon: "✅", count: stats.unverifiedProviders, color: "bg-emerald-500/20 text-emerald-400" },
    { label: "Přidat fiktivního fachmana", href: "/admin/seed-fachmani/new", icon: "🎭", color: "bg-purple-500/20 text-purple-400" },
    { label: "Nová promo akce", href: "/admin/promo/new", icon: "🚀", color: "bg-pink-500/20 text-pink-400" },
    { label: "Přidat kategorii", href: "/admin/kategorie", icon: "📁", color: "bg-amber-500/20 text-amber-400" },
    { label: "Spravovat tým", href: "/admin/tym", icon: "🏢", color: "bg-blue-500/20 text-blue-400" },
    { label: "Systémové nastavení", href: "/admin/nastaveni", icon: "⚙️", color: "bg-slate-500/20 text-slate-400" },
  ];

  const getActionLabel = (action: string) => {
    const actions: Record<string, string> = {
      login: "Přihlášení",
      logout: "Odhlášení",
      verify_user: "Ověření uživatele",
      create_promo: "Vytvoření promo",
      edit_user: "Úprava uživatele",
      delete_request: "Smazání poptávky",
    };
    return actions[action] || action;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">👋 Vítejte v administraci</h1>
          <p className="text-slate-300">
            Zde máte přehled o celé platformě Fachmani. Spravujte uživatele, poptávky a nastavení.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className={`relative bg-slate-800/50 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all ${
                stat.alert ? "ring-2 ring-red-500/50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                  <p className="text-slate-500 text-sm mt-1">{stat.subtext}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
              {stat.alert && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">⚡ Rychlé akce</h3>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                >
                  <span className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center text-lg`}>
                    {action.icon}
                  </span>
                  <span className="flex-1 text-white font-medium">{action.label}</span>
                  {action.count !== undefined && action.count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {action.count}
                    </span>
                  )}
                  <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📜 Poslední aktivita</h3>
            {recentActivity.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Zatím žádná aktivita</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 font-bold">
                      {activity.admin_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white">
                        <span className="font-medium">{activity.admin_name}</span>
                        <span className="text-slate-400 mx-2">•</span>
                        <span className="text-slate-300">{getActionLabel(activity.action)}</span>
                      </p>
                      <p className="text-slate-500 text-sm">
                        {new Date(activity.created_at).toLocaleString("cs-CZ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/admin/activity"
              className="block text-center text-cyan-400 hover:text-cyan-300 mt-4 text-sm font-medium"
            >
              Zobrazit vše →
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}