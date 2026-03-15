"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

export default function AdminTransakce() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select(`
        *,
        profiles:user_id (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;

    if (data) {
      const enriched = data.map(t => ({
        ...t,
        user_name: (t.profiles as { full_name?: string; email?: string } | null)?.full_name,
        user_email: (t.profiles as { full_name?: string; email?: string } | null)?.email,
      }));
      setTransactions(enriched);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        total: enriched.reduce((sum, t) => sum + (t.amount || 0), 0),
        pending: enriched.filter(t => t.status === "pending").reduce((sum, t) => sum + (t.amount || 0), 0),
        paid: enriched.filter(t => t.status === "paid").reduce((sum, t) => sum + (t.amount || 0), 0),
        thisMonth: enriched.filter(t => new Date(t.created_at) >= startOfMonth).reduce((sum, t) => sum + (t.amount || 0), 0),
      });
    }

    setLoading(false);
  };

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    await supabase
      .from("transactions")
      .update({ 
        status: newStatus,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null 
      })
      .eq("id", transactionId);

    loadTransactions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "Zaplaceno", color: "bg-emerald-500/20 text-emerald-400" };
      case "pending":
        return { label: "Čeká", color: "bg-yellow-500/20 text-yellow-400" };
      case "cancelled":
        return { label: "Zrušeno", color: "bg-red-500/20 text-red-400" };
      case "refunded":
        return { label: "Vráceno", color: "bg-purple-500/20 text-purple-400" };
      default:
        return { label: status, color: "bg-slate-500/20 text-slate-400" };
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      subscription: "📦 Předplatné",
      promotion: "🚀 Promo",
      boost: "📣 Boost",
      extra_offers: "📨 Extra nabídky",
    };
    return types[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">💳 Transakce</h1>
          <p className="text-slate-400">Přehled všech plateb a transakcí</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Celkem", value: `${stats.total.toLocaleString()} Kč`, color: "text-white", icon: "💰" },
            { label: "Čeká na platbu", value: `${stats.pending.toLocaleString()} Kč`, color: "text-yellow-400", icon: "⏳" },
            { label: "Zaplaceno", value: `${stats.paid.toLocaleString()} Kč`, color: "text-emerald-400", icon: "✅" },
            { label: "Tento měsíc", value: `${stats.thisMonth.toLocaleString()} Kč`, color: "text-cyan-400", icon: "📅" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Všechny" },
            { key: "pending", label: "⏳ Čekající" },
            { key: "paid", label: "✅ Zaplacené" },
            { key: "cancelled", label: "❌ Zrušené" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === f.key
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-white mb-2">Žádné transakce</h3>
              <p className="text-slate-400">Zatím nebyly zaznamenány žádné transakce.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Uživatel</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Typ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Částka</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Stav</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Datum</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((transaction) => {
                    const statusBadge = getStatusBadge(transaction.status);
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{transaction.user_name || "Neznámý"}</p>
                          <p className="text-slate-500 text-sm">{transaction.user_email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getTypeLabel(transaction.type)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-cyan-400 font-bold">{transaction.amount?.toLocaleString()} Kč</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(transaction.created_at).toLocaleDateString("cs-CZ")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {transaction.status === "pending" && (
                              <button
                                onClick={() => handleStatusChange(transaction.id, "paid")}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
                              >
                                ✅ Zaplaceno
                              </button>
                            )}
                            <select
                              value={transaction.status}
                              onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                              className="px-3 py-1.5 bg-slate-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                            >
                              <option value="pending">Čeká</option>
                              <option value="paid">Zaplaceno</option>
                              <option value="cancelled">Zrušeno</option>
                              <option value="refunded">Vráceno</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}