"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function SuperadminDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [advisorCount, setAdvisorCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [regData, setRegData] = useState<{ month: string; count: number }[]>([]);
  const [mrrData, setMrrData] = useState<{ month: string; mrr: number }[]>([]);
  const [recentAdvisors, setRecentAdvisors] = useState<{ id: string; company_name: string; created_at: string; subscription_tier: string }[]>([]);
  const [topAdvisors, setTopAdvisors] = useState<{ company_name: string; client_count: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [advisorsRes, clientsRes, dealsRes, plansRes] = await Promise.all([
        supabase.from("advisors").select("id, company_name, created_at, subscription_tier, is_active"),
        supabase.from("clients").select("id, advisor_id"),
        supabase.from("deals").select("id", { count: "exact", head: true }),
        supabase.from("pricing_plans").select("tier, price_monthly"),
      ]);

      const advisors = advisorsRes.data || [];
      const clients = clientsRes.data || [];
      const plans = plansRes.data || [];

      setAdvisorCount(advisors.length);
      setClientCount(clients.length);
      setDealCount(dealsRes.count || 0);

      const planPrices: Record<string, number> = {};
      plans.forEach((p) => { planPrices[p.tier] = p.price_monthly; });
      const totalMrr = advisors.filter((a) => a.is_active).reduce((s, a) => s + (planPrices[a.subscription_tier] || 0), 0);
      setMrr(totalMrr);

      // Registration trend (last 12 months)
      const now = new Date();
      const reg: { month: string; count: number }[] = [];
      const mrrTrend: { month: string; mrr: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthStr = d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" });
        const count = advisors.filter((a) => a.created_at >= d.toISOString() && a.created_at < end.toISOString()).length;
        reg.push({ month: monthStr, count });
        const activeByThen = advisors.filter((a) => a.created_at < end.toISOString());
        const monthMrr = activeByThen.reduce((s, a) => s + (planPrices[a.subscription_tier] || 0), 0);
        mrrTrend.push({ month: monthStr, mrr: monthMrr });
      }
      setRegData(reg);
      setMrrData(mrrTrend);

      // Recent registrations
      setRecentAdvisors(
        [...advisors].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)
      );

      // Top advisors by client count
      const clientCounts: Record<string, number> = {};
      clients.forEach((c) => { clientCounts[c.advisor_id] = (clientCounts[c.advisor_id] || 0) + 1; });
      const top = Object.entries(clientCounts)
        .map(([id, count]) => ({ company_name: advisors.find((a) => a.id === id)?.company_name || "—", client_count: count }))
        .sort((a, b) => b.client_count - a.client_count)
        .slice(0, 10);
      setTopAdvisors(top);

      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold gradient-text">Administrace</h1>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Poradců" value={String(advisorCount)} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard icon={Briefcase} label="Klientů" value={String(clientCount)} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard icon={TrendingUp} label="Dealů" value={String(dealCount)} color="text-violet-600" bg="bg-violet-50" />
        <KpiCard icon={DollarSign} label="MRR" value={formatCZK(mrr)} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Noví poradci</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={regData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Registrace" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">MRR trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mrrData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCZK(v as number)} />
              <Line type="monotone" dataKey="mrr" name="MRR" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Posledních 10 registrací</h2>
          <div className="space-y-2">
            {recentAdvisors.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-900">{a.company_name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{a.subscription_tier}</span>
                  <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Top poradci (klienti)</h2>
          <div className="space-y-2">
            {topAdvisors.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-900">{a.company_name}</span>
                <span className="text-sm font-bold text-slate-700">{a.client_count} klientů</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-900">{value}</p></div>
      </div>
    </div>
  );
}
