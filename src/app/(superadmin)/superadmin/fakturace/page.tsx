"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  BarChart3,
  Download,
  Search,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ───── Typy ───── */

interface Invoice {
  id: string;
  advisor_id: string;
  advisor_name: string;
  period: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface Advisor {
  id: string;
  company_name: string;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
}

/* ───── Cenové tarify ───── */

const TIER_PRICING: Record<string, number> = {
  starter: 990,
  professional: 1990,
  enterprise: 4990,
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

/* ───── Pomocné funkce ───── */

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(v);
}

function getDaysOverdue(dueDate: string | null, status: string): number {
  if (!dueDate || status === "paid") return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function getStatusBadge(status: string, daysOverdue: number) {
  if (status === "paid") {
    return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Zaplaceno</Badge>;
  }
  if (daysOverdue >= 30) {
    return <Badge className="bg-red-100 text-red-800 text-[10px] font-bold">Po splatnosti 30+</Badge>;
  }
  if (daysOverdue >= 14) {
    return <Badge className="bg-red-100 text-red-700 text-[10px]">Po splatnosti 14+</Badge>;
  }
  if (daysOverdue >= 7) {
    return <Badge className="bg-orange-100 text-orange-700 text-[10px]">Po splatnosti 7+</Badge>;
  }
  if (daysOverdue > 0) {
    return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Po splatnosti</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Nezaplaceno</Badge>;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(dateStr: string) {
  const [year, month] = dateStr.split("-");
  const months = ["Led", "Uno", "Bre", "Dub", "Kve", "Cer", "Cvc", "Srp", "Zar", "Rij", "Lis", "Pro"];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

/* ───── Komponenta ───── */

export default function BillingPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [generating, setGenerating] = useState(false);

  // Filtry
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [advisorSearch, setAdvisorSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      const [invoicesRes, advisorsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("period", { ascending: false }),
        supabase
          .from("advisors")
          .select("id, company_name, subscription_tier, is_active, created_at"),
      ]);

      const nameMap: Record<string, string> = {};
      (advisorsRes.data || []).forEach((a) => {
        nameMap[a.id] = a.company_name;
      });

      setAdvisors(advisorsRes.data || []);
      setInvoices(
        (invoicesRes.data || []).map((inv) => ({
          ...inv,
          advisor_name: nameMap[inv.advisor_id] || "---",
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── KPI metriky ───── */

  const activeAdvisors = useMemo(
    () => advisors.filter((a) => a.is_active),
    [advisors]
  );

  const mrr = useMemo(() => {
    return activeAdvisors.reduce((sum, a) => {
      return sum + (TIER_PRICING[a.subscription_tier] || 0);
    }, 0);
  }, [activeAdvisors]);

  const arr = mrr * 12;

  const unpaidSum = useMemo(() => {
    return invoices
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + i.amount, 0);
  }, [invoices]);

  const churnRate = useMemo(() => {
    const totalAdvisors = advisors.length;
    if (totalAdvisors === 0) return 0;
    const inactive = advisors.filter((a) => !a.is_active).length;
    return Math.round((inactive / totalAdvisors) * 100 * 10) / 10;
  }, [advisors]);

  /* ───── MRR trend (12 měsíců mock) ───── */

  const mrrTrendData = useMemo(() => {
    const now = new Date();
    const data: { month: string; mrr: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Simulace růstu MRR - více poradců v minulosti = nižší MRR
      const growthFactor = 1 - (i * 0.06);
      const monthMrr = Math.round(mrr * Math.max(growthFactor, 0.3));
      data.push({ month: getMonthLabel(period), mrr: monthMrr });
    }
    return data;
  }, [mrr]);

  /* ───── Cash flow predikce (3 měsíce) ───── */

  const cashFlowForecast = useMemo(() => {
    const now = new Date();
    const data: { month: string; prijmy: number; predikce: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Predikce: aktualni MRR s mirnym rustem
      const predicted = Math.round(mrr * (1 + i * 0.02));
      // Očekávané příjmy (90% platební morálka)
      const expected = Math.round(predicted * 0.9);
      data.push({
        month: getMonthLabel(period),
        prijmy: expected,
        predikce: predicted,
      });
    }
    return data;
  }, [mrr]);

  /* ───── LTV ───── */

  const avgMonthlyRevenue = useMemo(() => {
    if (activeAdvisors.length === 0) return 0;
    return mrr / activeAdvisors.length;
  }, [mrr, activeAdvisors]);

  const avgLifetimeMonths = useMemo(() => {
    if (churnRate === 0) return 60; // max 5 let
    return Math.min(Math.round(100 / churnRate), 60);
  }, [churnRate]);

  const ltv = Math.round(avgMonthlyRevenue * avgLifetimeMonths);

  /* ───── Filtrovane faktury ───── */

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all") {
        if (statusFilter === "unpaid" && inv.status === "paid") return false;
        if (statusFilter === "paid" && inv.status !== "paid") return false;
        if (statusFilter === "overdue") {
          const days = getDaysOverdue(inv.due_date, inv.status);
          if (days <= 0 || inv.status === "paid") return false;
        }
      }
      if (periodFilter && !inv.period.includes(periodFilter)) return false;
      if (
        advisorSearch &&
        !inv.advisor_name.toLowerCase().includes(advisorSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [invoices, statusFilter, periodFilter, advisorSearch]);

  /* ───── Generovani faktur ───── */

  async function generateInvoices() {
    setGenerating(true);
    const period = getCurrentPeriod();
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15)
      .toISOString()
      .split("T")[0];

    let created = 0;

    for (const adv of activeAdvisors) {
      const price = TIER_PRICING[adv.subscription_tier] || 0;
      if (price <= 0) continue;

      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("advisor_id", adv.id)
        .eq("period", period)
        .limit(1);
      if (existing && existing.length > 0) continue;

      await supabase.from("invoices").insert({
        advisor_id: adv.id,
        period,
        amount: price,
        status: "pending",
        due_date: dueDate,
      });
      created++;
    }

    toast.success(`Vygenerováno ${created} faktur za ${period}.`);

    // Refresh
    const { data: inv } = await supabase
      .from("invoices")
      .select("*")
      .order("period", { ascending: false });
    const nameMap: Record<string, string> = {};
    advisors.forEach((a) => {
      nameMap[a.id] = a.company_name;
    });
    setInvoices(
      (inv || []).map((i) => ({
        ...i,
        advisor_name: nameMap[i.advisor_id] || "---",
      }))
    );
    setGenerating(false);
  }

  /* ───── Změna stavu faktury ───── */

  async function updateStatus(id: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") updates.paid_at = new Date().toISOString();
    await supabase.from("invoices").update(updates).eq("id", id);
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: newStatus } : inv
      )
    );
    toast.success("Stav faktury aktualizován.");
  }

  /* ───── Export CSV ───── */

  function exportCSV() {
    const headers = [
      "Poradce",
      "Období",
      "Částka",
      "Datum splatnosti",
      "Stav",
      "Dní po splatnosti",
    ];
    const rows = filtered.map((inv) => {
      const days = getDaysOverdue(inv.due_date, inv.status);
      return [
        inv.advisor_name,
        inv.period,
        inv.amount.toString(),
        inv.due_date || "",
        inv.status === "paid" ? "Zaplaceno" : days > 0 ? `Po splatnosti (${days} dní)` : "Nezaplaceno",
        days.toString(),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `faktury_${getCurrentPeriod()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportováno.");
  }

  /* ───── Loading ───── */

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  /* ───── Render ───── */

  return (
    <div className="space-y-6">
      {/* Hlavicka */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold gradient-text">Fakturace</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={generateInvoices} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Receipt className="mr-2 h-4 w-4" />
            )}
            Generovat faktury za tento měsíc
          </Button>
        </div>
      </div>

      {/* KPI karty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                MRR
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCZK(mrr)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {activeAdvisors.length} aktivních poradců
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                ARR
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCZK(arr)}</p>
            <p className="text-xs text-slate-500 mt-1">MRR x 12</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Nezaplacené faktury
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCZK(unpaidSum)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {invoices.filter((i) => i.status !== "paid").length} faktur
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Churn rate
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{churnRate} %</p>
            <p className="text-xs text-slate-500 mt-1">
              {advisors.filter((a) => !a.is_active).length} neaktivních
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MRR trend graf */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vývoj MRR (posledních 12 měsíců)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mrrTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number | undefined) => [formatCZK(value ?? 0), "MRR"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash flow predikce + LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Predikce cash flow (příští 3 měsíce)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cashFlowForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => [
                    formatCZK(value ?? 0),
                    name === "prijmy" ? "Očekávané příjmy" : "Předpokládaný MRR",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "prijmy" ? "Očekávané příjmy" : "Předpokládaný MRR"
                  }
                />
                <Bar dataKey="prijmy" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predikce" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-base">Lifetime Value (LTV)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Prům. měsíční příjem / poradce</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCZK(Math.round(avgMonthlyRevenue))}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Prům. doba životnosti</p>
                <p className="text-lg font-bold text-slate-900">
                  {avgLifetimeMonths} měsíců
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 p-4 text-center">
              <p className="text-xs text-violet-600 mb-1">
                Průměrná LTV na poradce
              </p>
              <p className="text-3xl font-bold text-violet-700">
                {formatCZK(ltv)}
              </p>
              <p className="text-xs text-violet-400 mt-1">
                = {formatCZK(Math.round(avgMonthlyRevenue))} x {avgLifetimeMonths}{" "}
                měsíců
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">LTV podle tarifu</p>
              {Object.entries(TIER_PRICING).map(([tier, price]) => (
                <div
                  key={tier}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {TIER_LABELS[tier]}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatCZK(price * avgLifetimeMonths)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtry */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Stav" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny stavy</SelectItem>
              <SelectItem value="paid">Zaplaceno</SelectItem>
              <SelectItem value="unpaid">Nezaplaceno</SelectItem>
              <SelectItem value="overdue">Po splatnosti</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Období (např. 2026-03)"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="h-9 w-full sm:w-48"
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Hledat poradce..."
            value={advisorSearch}
            onChange={(e) => setAdvisorSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      </div>

      {/* Tabulka faktur */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Receipt className="mb-4 h-12 w-12 text-slate-200" />
          <p className="text-lg font-medium text-slate-400">Žádné faktury</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">Poradce</th>
                <th className="px-4 py-3">Období</th>
                <th className="px-4 py-3">Částka</th>
                <th className="px-4 py-3">Splatnost</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">Dní po splatnosti</th>
                <th className="px-4 py-3">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const daysOverdue = getDaysOverdue(inv.due_date, inv.status);
                return (
                  <tr
                    key={inv.id}
                    className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {inv.advisor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inv.period}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">
                      {formatCZK(inv.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString("cs-CZ")
                        : "---"}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(inv.status, daysOverdue)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inv.status !== "paid" && daysOverdue > 0 ? (
                        <span
                          className={`font-bold ${
                            daysOverdue >= 30
                              ? "text-red-700"
                              : daysOverdue >= 14
                                ? "text-red-600"
                                : daysOverdue >= 7
                                  ? "text-orange-600"
                                  : "text-amber-600"
                          }`}
                        >
                          {daysOverdue} dní
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={inv.status}
                        onValueChange={(v) => updateStatus(inv.id, v)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Nezaplaceno</SelectItem>
                          <SelectItem value="paid">Zaplaceno</SelectItem>
                          <SelectItem value="overdue">Po splatnosti</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
