"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Invoice = {
  id: string;
  user_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

export default function AdminFaktury() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    setLoading(true);

    let query = supabase
      .from("invoices")
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
      setInvoices(data.map(inv => ({
        ...inv,
        user_name: (inv.profiles as any)?.full_name,
        user_email: (inv.profiles as any)?.email,
      })));
    }

    setLoading(false);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    
    if (newStatus === "sent") {
      updates.sent_at = new Date().toISOString();
    } else if (newStatus === "paid") {
      updates.paid_at = new Date().toISOString();
    }

    await supabase.from("invoices").update(updates).eq("id", invoiceId);
    loadInvoices();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return { label: "Koncept", color: "bg-slate-500/20 text-slate-400" };
      case "sent":
        return { label: "Odesláno", color: "bg-blue-500/20 text-blue-400" };
      case "paid":
        return { label: "Zaplaceno", color: "bg-emerald-500/20 text-emerald-400" };
      case "overdue":
        return { label: "Po splatnosti", color: "bg-red-500/20 text-red-400" };
      default:
        return { label: status, color: "bg-slate-500/20 text-slate-400" };
    }
  };

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const pendingRevenue = invoices.filter(i => i.status === "sent").reduce((sum, i) => sum + i.total, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📄 Faktury</h1>
            <p className="text-slate-400">Správa fakturace</p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            + Vytvořit fakturu
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Celkem faktur", value: invoices.length, icon: "📄", color: "text-white" },
            { label: "Zaplaceno", value: `${totalRevenue.toLocaleString()} Kč`, icon: "✅", color: "text-emerald-400" },
            { label: "Čeká na platbu", value: `${pendingRevenue.toLocaleString()} Kč`, icon: "⏳", color: "text-yellow-400" },
            { label: "Po splatnosti", value: invoices.filter(i => i.status === "overdue").length, icon: "⚠️", color: "text-red-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl font-bold ${stat.color} mt-2`}>{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Všechny" },
            { key: "draft", label: "📝 Koncepty" },
            { key: "sent", label: "📧 Odeslané" },
            { key: "paid", label: "✅ Zaplacené" },
            { key: "overdue", label: "⚠️ Po splatnosti" },
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
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-white mb-2">Žádné faktury</h3>
              <p className="text-slate-400">Zatím nebyly vytvořeny žádné faktury.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Číslo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Klient</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Období</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase"></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Částka</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Stav</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((invoice) => {
                    const statusBadge = getStatusBadge(invoice.status);
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-white font-mono font-medium">{invoice.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{invoice.user_name || "Neznámý"}</p>
                          <p className="text-slate-500 text-sm">{invoice.user_email}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(invoice.period_start).toLocaleDateString("cs-CZ")} - {new Date(invoice.period_end).toLocaleDateString("cs-CZ")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-cyan-400 font-bold">{invoice.total?.toLocaleString()} Kč</span>
                          {invoice.tax > 0 && (
                            <p className="text-slate-500 text-xs">vč. DPH {invoice.tax?.toLocaleString()} Kč</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.status === "draft" && (
                              <button
                                onClick={() => handleStatusChange(invoice.id, "sent")}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                              >
                                📧 Odeslat
                              </button>
                            )}
                            {invoice.status === "sent" && (
                              <button
                                onClick={() => handleStatusChange(invoice.id, "paid")}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
                              >
                                ✅ Zaplaceno
                              </button>
                            )}
                            <button className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-sm hover:bg-white/10 transition-colors">
                              📥 PDF
                            </button>
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