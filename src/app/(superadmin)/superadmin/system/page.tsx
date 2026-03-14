"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, AlertTriangle, RefreshCw } from "lucide-react";

interface SystemHealth {
  status: string;
  timestamp: string;
  counts: Record<string, number>;
  activeUsers: { day: number; week: number; month: number };
  criticalErrors24h: number;
}

export default function SystemPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system-health");
      if (!res.ok) throw new Error("Nepodařilo se načíst zdraví systému");
      const data: SystemHealth = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium text-slate-700">Chyba systému</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Zkusit znovu
        </Button>
      </div>
    );
  }

  if (!health) return null;

  const mainCounts = [
    { label: "Poradci", key: "advisors" },
    { label: "Klienti", key: "clients" },
    { label: "Obchody", key: "deals" },
    { label: "Smlouvy", key: "contracts" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Zdraví systému</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Stav: <Badge variant="secondary" className="text-[10px] ml-1">{health.status}</Badge>
            <span className="ml-3">
              Aktualizováno: {new Date(health.timestamp).toLocaleString("cs-CZ")}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Obnovit
        </Button>
      </div>

      {/* Main counts */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {mainCounts.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {(health.counts[item.key] ?? 0).toLocaleString("cs-CZ")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active users */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
          Aktivní uživatelé
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Za den", value: health.activeUsers.day, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Za týden", value: health.activeUsers.week, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Za měsíc", value: health.activeUsers.month, color: "text-violet-600", bg: "bg-violet-50" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                  <Activity className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {item.value.toLocaleString("cs-CZ")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical errors */}
      <div className="mb-6">
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            health.criticalErrors24h > 0
              ? "border-red-200 bg-red-50"
              : "bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                health.criticalErrors24h > 0 ? "bg-red-100" : "bg-slate-50"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  health.criticalErrors24h > 0 ? "text-red-600" : "text-slate-400"
                }`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Kritické chyby (24h)</p>
              <p
                className={`text-xl font-bold ${
                  health.criticalErrors24h > 0 ? "text-red-700" : "text-slate-900"
                }`}
              >
                {health.criticalErrors24h}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* All table counts */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
          Počet záznamů ve všech tabulkách
        </h2>
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                <th className="px-6 py-3">Tabulka</th>
                <th className="px-6 py-3 text-right">Počet</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(health.counts).map(([table, count]) => (
                <tr
                  key={table}
                  className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">{table}</td>
                  <td className="px-6 py-3 text-sm font-bold text-slate-900 text-right">
                    {count.toLocaleString("cs-CZ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
