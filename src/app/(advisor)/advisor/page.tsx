"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { SEGMENT_CONFIG } from "@/lib/scoring";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Clock,
  ArrowUpRight,
  Lightbulb,
  Eye,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function formatCZK(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M Kč`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} tis. Kč`;
  return `${value} Kč`;
}

const PIE_COLORS = ["#3B82F6", "#6B7280", "#22C55E", "#F97316"];
const SEGMENT_COLORS: Record<string, string> = {
  vip: "#F59E0B",
  active: "#22C55E",
  standard: "#3B82F6",
  sleeping: "#94A3B8",
  new: "#8B5CF6",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Dobré ráno";
  if (h >= 12 && h < 18) return "Dobré odpoledne";
  return "Dobrý večer";
}

function formatCzechDate(): string {
  return new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href?: string;
}

export default function AdvisorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [kpi, setKpi] = useState({
    totalLeads: 0,
    newDeals: 0,
    conversionRate: 0,
    pipelineValue: 0,
    avgDaysInPipeline: 0,
  });
  const [funnelData, setFunnelData] = useState<{ name: string; count: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; leads: number; conversions: number }[]>([]);
  const [sourceData, setSourceData] = useState<{ name: string; value: number }[]>([]);
  const [topDeals, setTopDeals] = useState<{ title: string; value: number; contact: string; stage: string }[]>([]);
  const [segmentData, setSegmentData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [upsellAlerts, setUpsellAlerts] = useState<{ id: string; title: string; description: string | null; status: string; client_id: string }[]>([]);
  const [monthlyLeads, setMonthlyLeads] = useState<number[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient();

      // Check onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adv } = await supabase.from("advisors").select("onboarding_completed, company_name").eq("user_id", user.id).single();
        if (adv && !adv.onboarding_completed) { router.push("/advisor/vitejte"); return; }
        if (adv?.company_name) setUserName(adv.company_name);
        else setUserName(user.email?.split("@")[0] || "");

        // Load checklist progress
        const { data: progress } = await supabase.from("onboarding_progress").select("steps, completed_at").eq("user_id", user.id).eq("role", "advisor").single();
        if (progress && progress.completed_at) {
          const steps = (progress.steps || {}) as Record<string, boolean>;
          const items: ChecklistItem[] = [
            { key: "company", label: "Nastavit firmu", done: !!steps.company, href: "/advisor/settings" },
            { key: "appearance", label: "Vzhled portálu", done: !!steps.appearance, href: "/advisor/nastaveni/branding" },
            { key: "modules", label: "Vybrat moduly", done: !!steps.modules, href: "/advisor/settings" },
            { key: "first_client", label: "Přidat klienta", done: !!(steps.first_client || steps.first_client_skipped), href: "/advisor/clients" },
            { key: "connections", label: "Propojit služby", done: !!steps.connections, href: "/advisor/settings" },
          ];
          const allDone = items.every((i) => i.done);
          if (!allDone) {
            setChecklist(items);
            setShowChecklist(true);
          }
        }
      }
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [dealsRes, stagesRes, allDealsRes, clientsRes, alertsRes] = await Promise.all([
        supabase.from("deals").select("*"),
        supabase.from("pipeline_stages").select("*").order("position"),
        supabase.from("deals").select("id, title, value, contact_name, stage_id, source, created_at, converted_at, lost_at"),
        supabase.from("clients").select("id, segment"),
        supabase.from("upsell_alerts").select("id, title, description, status, client_id").in("status", ["new", "viewed"]).order("created_at", { ascending: false }).limit(5),
      ]);

      const deals = allDealsRes.data || [];
      const stages = stagesRes.data || [];
      const clients = clientsRes.data || [];

      // KPI
      const thisMonthDeals = deals.filter((d) => d.created_at >= startOfMonth);
      const wonDeals = deals.filter((d) => d.converted_at);
      const closedDeals = deals.filter((d) => d.converted_at || d.lost_at);
      const rate = closedDeals.length > 0
        ? Math.round((wonDeals.length / closedDeals.length) * 100)
        : 0;
      const totalValue = deals
        .filter((d) => !d.lost_at)
        .reduce((s, d) => s + (d.value || 0), 0);

      // Average days in pipeline for won deals
      const pipelineDays = wonDeals
        .map((d) => {
          const created = new Date(d.created_at).getTime();
          const converted = new Date(d.converted_at).getTime();
          return Math.round((converted - created) / (1000 * 60 * 60 * 24));
        })
        .filter((d) => d >= 0);
      const avgDays =
        pipelineDays.length > 0
          ? Math.round(pipelineDays.reduce((a, b) => a + b, 0) / pipelineDays.length)
          : 0;

      setKpi({
        totalLeads: deals.length,
        newDeals: thisMonthDeals.length,
        conversionRate: rate,
        pipelineValue: totalValue,
        avgDaysInPipeline: avgDays,
      });

      // Funnel
      setFunnelData(
        stages.map((s) => ({
          name: s.name,
          count: deals.filter((d) => d.stage_id === s.id).length,
          color: s.color,
        }))
      );

      // Trends (last 6 months)
      const months: { month: string; leads: number; conversions: number }[] = [];
      const monthlyLeadCounts: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthStr = d.toLocaleDateString("cs-CZ", { month: "short" });
        const monthLeads = deals.filter(
          (deal) => deal.created_at >= d.toISOString() && deal.created_at < end.toISOString()
        ).length;
        const monthConversions = wonDeals.filter(
          (deal) =>
            deal.converted_at >= d.toISOString() && deal.converted_at < end.toISOString()
        ).length;
        months.push({ month: monthStr, leads: monthLeads, conversions: monthConversions });
        monthlyLeadCounts.push(monthLeads);
      }
      setTrendData(months);
      setMonthlyLeads(monthlyLeadCounts.slice(-5));

      // Source breakdown
      const sources: Record<string, number> = {};
      deals.forEach((d) => {
        const src = d.source === "meta" ? "Meta Ads" : d.source === "referral" ? "Doporučení" : "Manuální";
        sources[src] = (sources[src] || 0) + 1;
      });
      setSourceData(Object.entries(sources).map(([name, value]) => ({ name, value })));

      // Top deals
      const sorted = [...deals]
        .filter((d) => !d.lost_at)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 5);
      setTopDeals(
        sorted.map((d) => ({
          title: d.title,
          value: d.value || 0,
          contact: d.contact_name || "—",
          stage: stages.find((s) => s.id === d.stage_id)?.name || "—",
        }))
      );

      // Client segments
      const segments: Record<string, number> = {};
      clients.forEach((c) => {
        const seg = c.segment || "new";
        segments[seg] = (segments[seg] || 0) + 1;
      });
      setSegmentData(
        Object.entries(segments).map(([key, value]) => ({
          name: SEGMENT_CONFIG[key]?.label || key,
          value,
          color: SEGMENT_COLORS[key] || "#94A3B8",
        }))
      );

      setUpsellAlerts(alertsRes.data || []);

      setLoading(false);
    }
    fetchDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl col-span-2" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Skeleton className="h-80 rounded-2xl col-span-3" />
          <Skeleton className="h-80 rounded-2xl col-span-2" />
        </div>
      </div>
    );
  }

  const totalSourceCount = sourceData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {getGreeting()}, {userName || "poradce"}
          </h1>
          <p className="mt-1 text-gray-500">Tady je přehled vašeho podnikání</p>
        </div>
        <p className="hidden md:block text-sm text-gray-400 mt-1">{formatCzechDate()}</p>
      </div>

      {/* KPI Bento Grid */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {/* Card 1 — Pipeline value (large) */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white hover:shadow-md transition-shadow duration-200">
          <p className="text-sm font-medium uppercase tracking-wide text-white/70 mb-4">Hodnota pipeline</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">{formatCZK(kpi.pipelineValue)}</p>
            {/* Sparkline */}
            <div className="flex items-end gap-1 h-10">
              {(monthlyLeads.length > 0 ? monthlyLeads : [3, 5, 4, 7, 6]).map((v, i) => {
                const max = Math.max(...(monthlyLeads.length > 0 ? monthlyLeads : [3, 5, 4, 7, 6]), 1);
                return (
                  <div
                    key={i}
                    className="w-2 rounded-t bg-white/30"
                    style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2 — New leads */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-shadow duration-200">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Nové leady</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{kpi.newDeals}</p>
            <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">tento měsíc</p>
        </div>

        {/* Card 3 — Conversion (circular progress) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-shadow duration-200">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Konverze</p>
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${kpi.conversionRate * 0.9425} 94.25`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                {kpi.conversionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second row — Aktivní klienti */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-shadow duration-200">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Aktivní klienti</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900">{kpi.totalLeads}</p>
            <div className="flex items-end gap-1 h-8">
              {(monthlyLeads.length > 0 ? monthlyLeads : [2, 4, 3, 5, 6]).map((v, i) => {
                const max = Math.max(...(monthlyLeads.length > 0 ? monthlyLeads : [2, 4, 3, 5, 6]), 1);
                return (
                  <div
                    key={i}
                    className="w-2 rounded-t bg-blue-400"
                    style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-shadow duration-200">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Ø dny v pipeline</p>
          <p className="text-2xl font-bold text-gray-900">{kpi.avgDaysInPipeline} dní</p>
        </div>
      </div>

      {/* Charts — Pipeline + Sources */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Pipeline overview (60%) */}
        <div className="md:col-span-3 rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Přehled pipeline</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Dealů" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source donut (40%) */}
        <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Zdroje leadů</h2>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalSourceCount}</p>
                <p className="text-xs text-gray-400">celkem</p>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {sourceData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-500">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top deals (as "Nejbližší příležitosti") */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Top příležitosti</h2>
          <div className="space-y-3">
            {topDeals.length === 0 && (
              <p className="text-sm text-gray-400">Žádné dealy</p>
            )}
            {topDeals.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{d.title}</p>
                  <p className="text-xs text-gray-400">{d.contact} · {d.stage}</p>
                </div>
                <span className="shrink-0 ml-2 text-sm font-bold text-gray-900">
                  {formatCZK(d.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Client segments */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Segmentace klientů</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={segmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {segmentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {segmentData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upsell alerts */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Příležitosti</h2>
          </div>
          {upsellAlerts.length === 0 && (
            <p className="text-sm text-gray-400">Žádné nové příležitosti</p>
          )}
          <div className="space-y-3">
            {upsellAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    {alert.description && <p className="mt-0.5 text-xs text-gray-400">{alert.description}</p>}
                  </div>
                  <div className="ml-2 flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.from("upsell_alerts").update({ status: "viewed" }).eq("id", alert.id);
                      }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Zobrazit
                    </button>
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.from("upsell_alerts").update({ status: "dismissed" }).eq("id", alert.id);
                        setUpsellAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                      }}
                      className="rounded-md p-1 hover:bg-red-50"
                      title="Zamítnout"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      {showChecklist && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow duration-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Dokončete nastavení</h2>
            <span className="text-xs text-gray-400">{checklist.filter((i) => i.done).length}/{checklist.length}</span>
          </div>
          <div className="mb-3 h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${(checklist.filter((i) => i.done).length / checklist.length) * 100}%` }}
            />
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.key}
                onClick={() => item.href && !item.done && router.push(item.href)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${!item.done && item.href ? "hover:bg-gray-50 cursor-pointer" : ""}`}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                )}
                <span className={`text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.label}</span>
                {!item.done && item.href && <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-gray-300" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowChecklist(false)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skrýt
          </button>
        </div>
      )}
    </div>
  );
}
