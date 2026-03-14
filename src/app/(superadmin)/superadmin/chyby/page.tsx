"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bug,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ErrorLog {
  id: string;
  type: string;
  message: string;
  severity: string;
  user_id: string | null;
  url: string | null;
  created_at: string;
}

interface GroupedError {
  message: string;
  type: string;
  severity: string;
  user_id: string | null;
  url: string | null;
  count: number;
  latest_at: string;
}

interface DayChart {
  day: string;
  count: number;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

const severityLabels: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

export default function ErrorsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function fetchData() {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data } = await supabase
        .from("error_logs")
        .select("*")
        .gte("created_at", fourteenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      setErrors(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

  const errorsToday = errors.filter((e) => e.created_at >= todayStart);
  const criticalToday = errorsToday.filter((e) => e.severity === "critical");
  const critical24h = errors.filter(
    (e) => e.severity === "critical" && e.created_at >= yesterday
  );

  // Most common type
  const typeCounts: Record<string, number> = {};
  errorsToday.forEach((e) => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Group by message
  const filtered = errors.filter((e) => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (dateFrom && e.created_at < new Date(dateFrom).toISOString()) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      if (e.created_at >= to.toISOString()) return false;
    }
    return true;
  });

  const groupMap = new Map<string, GroupedError>();
  filtered.forEach((e) => {
    const key = `${e.message}|${e.type}|${e.severity}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.count++;
      if (e.created_at > existing.latest_at) {
        existing.latest_at = e.created_at;
        existing.user_id = e.user_id;
        existing.url = e.url;
      }
    } else {
      groupMap.set(key, {
        message: e.message,
        type: e.type,
        severity: e.severity,
        user_id: e.user_id,
        url: e.url,
        count: 1,
        latest_at: e.created_at,
      });
    }
  });

  const grouped = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);

  // Chart data: errors per day (last 14 days)
  const chartData: DayChart[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const dStr = d.toISOString();
    const nextStr = nextD.toISOString();
    const count = errors.filter((e) => e.created_at >= dStr && e.created_at < nextStr).length;
    chartData.push({
      day: d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
      count,
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Monitoring chyb</h1>

      {/* Critical alert */}
      {critical24h.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">
            {critical24h.length} kritických chyb za posledních 24 hodin
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={Bug}
          label="Chyb dnes"
          value={String(errorsToday.length)}
          color="text-red-600"
          bg="bg-red-50"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Kritických dnes"
          value={String(criticalToday.length)}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          icon={TrendingUp}
          label="Nejčastější typ"
          value={mostCommonType ? `${mostCommonType[0]} (${mostCommonType[1]})` : "—"}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
          Chyby za posledních 14 dní
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" name="Chyby" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Závažnost" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="critical">Kritická</SelectItem>
            <SelectItem value="high">Vysoká</SelectItem>
            <SelectItem value="medium">Střední</SelectItem>
            <SelectItem value="low">Nízká</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            placeholder="Od"
          />
          <span className="text-slate-400 text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            placeholder="Do"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-slate-500"
            >
              Zrušit
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Zpráva</th>
              <th className="px-4 py-3">Uživatel</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Závažnost</th>
              <th className="px-4 py-3 text-right">Počet</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  <Bug className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Žádné chyby nebyly nalezeny
                </td>
              </tr>
            ) : (
              grouped.map((g, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(g.latest_at).toLocaleString("cs-CZ", {
                      day: "numeric",
                      month: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">
                    {g.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 max-w-[300px] truncate">
                    {g.message}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {g.user_id ? g.user_id.slice(0, 8) + "..." : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">
                    {g.url || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${severityColors[g.severity] || "bg-slate-100 text-slate-700"}`}
                    >
                      {severityLabels[g.severity] || g.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {g.count}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Zobrazeno {grouped.length} seskupených chyb z {filtered.length} záznamů
      </p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Bug;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
