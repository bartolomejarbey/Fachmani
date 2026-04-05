"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Payment = {
  id: string;
  user_id: string;
  type: string;
  amount_kc: number;
  status: string;
  comgate_trans_id: string | null;
  is_test: boolean;
  created_at: string;
  paid_at: string | null;
  profiles?: { full_name: string } | null;
};

type PremiumSub = {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  next_billing_at: string | null;
  cancelled_at: string | null;
  profiles?: { full_name: string } | null;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [premiumSubs, setPremiumSubs] = useState<PremiumSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    topupRevenue: 0,
    premiumRevenue: 0,
    pendingCount: 0,
    activePremium: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [paymentsRes, premiumRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("premium_subscriptions")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false }),
    ]);

    const allPayments = (paymentsRes.data || []) as Payment[];
    const allSubs = (premiumRes.data || []) as PremiumSub[];

    setPayments(allPayments);
    setPremiumSubs(allSubs);

    const paidPayments = allPayments.filter(p => p.status === "paid");
    const topupPaid = paidPayments.filter(p => p.type === "topup");
    const premiumPaid = paidPayments.filter(p => p.type.startsWith("premium"));

    setStats({
      totalRevenue: paidPayments.reduce((sum, p) => sum + p.amount_kc, 0),
      totalTransactions: paidPayments.length,
      topupRevenue: topupPaid.reduce((sum, p) => sum + p.amount_kc, 0),
      premiumRevenue: premiumPaid.reduce((sum, p) => sum + p.amount_kc, 0),
      pendingCount: allPayments.filter(p => p.status === "pending").length,
      activePremium: allSubs.filter(s => s.status === "active").length,
    });

    setLoading(false);
  };

  const filteredPayments = payments.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["ID", "Uzivatel", "Typ", "Castka", "Status", "ComGate ID", "Test", "Vytvoreno", "Zaplaceno"];
    const rows = filteredPayments.map(p => [
      p.id,
      p.profiles?.full_name || "N/A",
      p.type,
      p.amount_kc,
      p.status,
      p.comgate_trans_id || "",
      p.is_test ? "ANO" : "NE",
      new Date(p.created_at).toLocaleString("cs-CZ"),
      p.paid_at ? new Date(p.paid_at).toLocaleString("cs-CZ") : "",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platby_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-emerald-500/20 text-emerald-400",
      pending: "bg-amber-500/20 text-amber-400",
      failed: "bg-red-500/20 text-red-400",
      cancelled: "bg-slate-500/20 text-slate-400",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400";
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, { color: string; label: string }> = {
      topup: { color: "bg-cyan-500/20 text-cyan-400", label: "Dobiti" },
      premium_initial: { color: "bg-purple-500/20 text-purple-400", label: "Premium" },
      premium_recurring: { color: "bg-indigo-500/20 text-indigo-400", label: "Recurring" },
    };
    return colors[type] || { color: "bg-slate-500/20 text-slate-400", label: type };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">💳 Platby & Penezenky</h1>
            <p className="text-slate-400 text-sm mt-1">Prehled vsech plateb a predplatnych</p>
          </div>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-600 transition-all"
          >
            📥 Export CSV
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6">
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse mb-3" />
                <div className="h-8 w-24 bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Celkovy obrat</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.totalRevenue.toLocaleString()} Kc</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Pocet transakci</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalTransactions}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Top-up obrat</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.topupRevenue.toLocaleString()} Kc</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Premium obrat</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.premiumRevenue.toLocaleString()} Kc</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Cekajici platby</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pendingCount}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase">Aktivni Premium</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.activePremium}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Payments table */}
              <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Platby</h2>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm border-0"
                    >
                      <option value="all">Vse statusy</option>
                      <option value="paid">Zaplaceno</option>
                      <option value="pending">Cekajici</option>
                      <option value="failed">Selhalo</option>
                      <option value="cancelled">Zruseno</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm border-0"
                    >
                      <option value="all">Vse typy</option>
                      <option value="topup">Dobiti</option>
                      <option value="premium_initial">Premium</option>
                      <option value="premium_recurring">Recurring</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredPayments.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">Zadne platby</p>
                  ) : (
                    filteredPayments.map(p => {
                      const typeInfo = typeBadge(p.type);
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(p.status)}`}>
                                {p.status}
                              </span>
                              {p.is_test && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">TEST</span>
                              )}
                            </div>
                            <p className="text-slate-300 text-sm">{p.profiles?.full_name || "N/A"}</p>
                            {p.comgate_trans_id && (
                              <p className="text-slate-500 text-xs font-mono truncate">{p.comgate_trans_id}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{p.amount_kc.toLocaleString()} Kc</p>
                            <p className="text-slate-500 text-xs">
                              {new Date(p.created_at).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Premium subscriptions */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Premium predplatne</h2>
                {premiumSubs.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">Zadne predplatne</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {premiumSubs.map(sub => (
                      <div key={sub.id} className="p-3 rounded-xl bg-slate-700/30">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white text-sm font-semibold">{sub.profiles?.full_name || "N/A"}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            sub.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : sub.status === "cancelled"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">
                          Od: {new Date(sub.started_at).toLocaleDateString("cs-CZ")}
                        </p>
                        {sub.next_billing_at && (
                          <p className="text-slate-400 text-xs">
                            Dalsi: {new Date(sub.next_billing_at).toLocaleDateString("cs-CZ")}
                          </p>
                        )}
                        {sub.cancelled_at && (
                          <p className="text-red-400 text-xs">
                            Zruseno: {new Date(sub.cancelled_at).toLocaleDateString("cs-CZ")}
                          </p>
                        )}
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
