"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Activity = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
};

const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
  login: { label: "Přihlášení", icon: "🔑", color: "text-emerald-400" },
  logout: { label: "Odhlášení", icon: "🚪", color: "text-slate-400" },
  verify_user: { label: "Ověření uživatele", icon: "✅", color: "text-emerald-400" },
  unverify_user: { label: "Zrušení ověření", icon: "❌", color: "text-red-400" },
  change_role: { label: "Změna role", icon: "👤", color: "text-blue-400" },
  change_admin_role: { label: "Změna admin role", icon: "🛡️", color: "text-purple-400" },
  change_request_status: { label: "Změna stavu poptávky", icon: "📋", color: "text-cyan-400" },
  delete_request: { label: "Smazání poptávky", icon: "🗑️", color: "text-red-400" },
  create_promo: { label: "Vytvoření promo", icon: "🚀", color: "text-pink-400" },
  add_team_member: { label: "Přidání člena týmu", icon: "👥", color: "text-emerald-400" },
  remove_team_member: { label: "Odebrání z týmu", icon: "👤", color: "text-orange-400" },
  change_team_role: { label: "Změna role v týmu", icon: "🔄", color: "text-blue-400" },
  create_seed_provider: { label: "Vytvoření fiktivního fachmana", icon: "🎭", color: "text-purple-400" },
  update_seed_provider: { label: "Úprava fiktivního fachmana", icon: "✏️", color: "text-cyan-400" },
};

export default function AdminActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  useEffect(() => {
    loadActivities();
  }, [filter, page]);

  const loadActivities = async () => {
    setLoading(true);

    let query = supabase
      .from("admin_activity_log")
      .select(`
        *,
        profiles:admin_id (full_name, email)
      `)
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (filter !== "all") {
      query = query.eq("action", filter);
    }

    const { data } = await query;

    if (data) {
      const enriched = data.map(a => ({
        ...a,
        admin_name: (a.profiles as any)?.full_name,
        admin_email: (a.profiles as any)?.email,
      }));

      if (page === 0) {
        setActivities(enriched);
      } else {
        setActivities(prev => [...prev, ...enriched]);
      }

      setHasMore(data.length === limit);
    }

    setLoading(false);
  };

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action, icon: "📌", color: "text-slate-400" };
  };

  const formatDetails = (details: any) => {
    if (!details) return null;
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  const uniqueActions = [...new Set(activities.map(a => a.action))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">📜 Activity Log</h1>
          <p className="text-slate-400">Historie všech akcí v administraci</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Dnes", value: activities.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString()).length, icon: "📅" },
            { label: "Tento týden", value: activities.filter(a => {
              const date = new Date(a.created_at);
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return date >= weekAgo;
            }).length, icon: "📆" },
            { label: "Přihlášení", value: activities.filter(a => a.action === "login").length, icon: "🔑" },
            { label: "Změny", value: activities.filter(a => a.action.startsWith("change") || a.action.startsWith("create")).length, icon: "✏️" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilter("all"); setPage(0); }}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === "all" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Všechny
          </button>
          {["login", "verify_user", "create_promo", "change_role"].map((action) => {
            const info = getActionInfo(action);
            return (
              <button
                key={action}
                onClick={() => { setFilter(action); setPage(0); }}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === action ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {info.icon} {info.label}
              </button>
            );
          })}
        </div>

        {/* Activity List */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading && page === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📜</div>
              <h3 className="text-xl font-bold text-white mb-2">Žádná aktivita</h3>
              <p className="text-slate-400">Zatím nebyly zaznamenány žádné akce.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activities.map((activity) => {
                const actionInfo = getActionInfo(activity.action);
                
                return (
                  <div key={activity.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {actionInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">{activity.admin_name || "System"}</span>
                          <span className="text-slate-500">•</span>
                          <span className={`font-medium ${actionInfo.color}`}>{actionInfo.label}</span>
                        </div>
                        {activity.details && (
                          <p className="text-slate-400 text-sm mt-1">
                            {formatDetails(activity.details)}
                          </p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(activity.created_at).toLocaleString("cs-CZ")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMore && activities.length > 0 && (
            <div className="p-4 text-center border-t border-white/5">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-6 py-2 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                {loading ? "Načítám..." : "Načíst další"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}