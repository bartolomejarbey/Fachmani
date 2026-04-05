"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type DailyUsage = {
  date: string;
  total_tokens: number;
  cost_usd: number;
  count: number;
};

type TopUser = {
  user_id: string;
  full_name: string;
  total_tokens: number;
  cost_usd: number;
  count: number;
};

type UsageRow = {
  id: string;
  user_id: string;
  type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  user_message: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
};

export default function AIUsagePage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
    chatRequests: 0,
    recommendRequests: 0,
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [recentUsage, setRecentUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const getStartDate = () => {
    const now = new Date();
    switch (period) {
      case "day":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  };

  const loadData = async () => {
    setLoading(true);
    const startDate = getStartDate();

    // Fetch all usage for period
    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("*, user_message, profiles:user_id(full_name)")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    const rows = (usageData || []) as UsageRow[];

    // Calculate stats
    let totalTokens = 0;
    let totalCost = 0;
    let chatRequests = 0;
    let recommendRequests = 0;

    rows.forEach((r) => {
      totalTokens += r.total_tokens || 0;
      totalCost += Number(r.cost_usd) || 0;
      if (r.type === "chat") chatRequests++;
      if (r.type === "recommend") recommendRequests++;
    });

    setStats({
      totalTokens,
      totalCost,
      totalRequests: rows.length,
      chatRequests,
      recommendRequests,
    });

    // Daily breakdown
    const dailyMap = new Map<string, DailyUsage>();
    rows.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString("cs-CZ");
      const existing = dailyMap.get(date) || { date, total_tokens: 0, cost_usd: 0, count: 0 };
      existing.total_tokens += r.total_tokens || 0;
      existing.cost_usd += Number(r.cost_usd) || 0;
      existing.count += 1;
      dailyMap.set(date, existing);
    });
    setDailyUsage(Array.from(dailyMap.values()));

    // Top users
    const userMap = new Map<string, TopUser>();
    rows.forEach((r) => {
      const existing = userMap.get(r.user_id) || {
        user_id: r.user_id,
        full_name: r.profiles?.full_name || "Neznámý",
        total_tokens: 0,
        cost_usd: 0,
        count: 0,
      };
      existing.total_tokens += r.total_tokens || 0;
      existing.cost_usd += Number(r.cost_usd) || 0;
      existing.count += 1;
      userMap.set(r.user_id, existing);
    });
    setTopUsers(
      Array.from(userMap.values())
        .sort((a, b) => b.total_tokens - a.total_tokens)
        .slice(0, 10)
    );

    // Recent usage
    setRecentUsage(rows.slice(0, 20));

    setLoading(false);
  };

  const maxTokens = Math.max(...dailyUsage.map((d) => d.total_tokens), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🤖 AI Spotřeba</h1>
            <p className="text-slate-400 text-sm mt-1">Přehled využití OpenAI GPT-4o-mini</p>
          </div>
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  period === p
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {p === "day" ? "Dnes" : p === "week" ? "Týden" : "Měsíc"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6">
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse mb-3" />
                <div className="h-8 w-24 bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Celkem tokenů</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalTokens.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Náklady (USD)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">${stats.totalCost.toFixed(4)}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Celkem requestů</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalRequests}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Chat</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.chatRequests}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Doporučení</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.recommendRequests}</p>
              </div>
            </div>

            {/* Chart */}
            {dailyUsage.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Spotřeba tokenů v čase</h2>
                <div className="flex items-end gap-2 h-48">
                  {dailyUsage.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-400">{d.total_tokens.toLocaleString()}</span>
                      <div
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg transition-all"
                        style={{ height: `${(d.total_tokens / maxTokens) * 100}%`, minHeight: "4px" }}
                      />
                      <span className="text-xs text-slate-500 truncate w-full text-center">{d.date.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top users */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Top 10 uživatelů</h2>
                {topUsers.length === 0 ? (
                  <p className="text-slate-500 text-sm">Žádná data</p>
                ) : (
                  <div className="space-y-3">
                    {topUsers.map((user, i) => (
                      <div key={user.user_id} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
                          <p className="text-slate-500 text-xs">{user.count} requestů</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-semibold">{user.total_tokens.toLocaleString()}</p>
                          <p className="text-emerald-400 text-xs">${user.cost_usd.toFixed(4)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent usage */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Poslední requesty</h2>
                {recentUsage.length === 0 ? (
                  <p className="text-slate-500 text-sm">Žádná data</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recentUsage.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          r.type === "chat"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {r.type === "chat" ? "💬" : "🤖"} {r.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-300 text-xs truncate">{r.profiles?.full_name || "Anon"}</p>
                          {r.user_message && (
                            <p className="text-slate-500 text-xs truncate mt-0.5">&quot;{r.user_message}&quot;</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-slate-300 text-xs">{(r.total_tokens || 0).toLocaleString()} tok</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(r.created_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
