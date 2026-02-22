"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import Link from "next/link";

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  expires_at: string;
  customer_id: string;
  category_id: string;
  customer_name?: string;
  customer_email?: string;
  category_name?: string;
  category_icon?: string;
  offers_count?: number;
};

export default function AdminPoptavky() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from("requests")
      .select(`
        *,
        profiles:customer_id (full_name, email),
        categories:category_id (name, icon)
      `)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("status", "active");
    } else if (filter === "completed") {
      query = query.eq("status", "completed");
    } else if (filter === "expired") {
      query = query.eq("status", "expired");
    } else if (filter === "cancelled") {
      query = query.eq("status", "cancelled");
    }

    const { data } = await query;

    if (data) {
      // Načteme počty nabídek
      const requestIds = data.map(r => r.id);
      const { data: offersData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      const enrichedData = data.map(r => ({
        ...r,
        customer_name: (r.profiles as any)?.full_name,
        customer_email: (r.profiles as any)?.email,
        category_name: (r.categories as any)?.name,
        category_icon: (r.categories as any)?.icon,
        offers_count: offersCounts[r.id] || 0,
      }));

      setRequests(enrichedData);
    }

    setLoading(false);
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    await supabase
      .from("requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "change_request_status",
      target_type: "request",
      target_id: requestId,
      details: { new_status: newStatus },
    });

    loadRequests();
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm("Opravdu smazat tuto poptávku? Tato akce je nevratná.")) return;

    await supabase.from("requests").delete().eq("id", requestId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "delete_request",
      target_type: "request",
      target_id: requestId,
    });

    loadRequests();
  };

  const filteredRequests = requests.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Aktivní", color: "bg-emerald-500/20 text-emerald-400" };
      case "completed":
        return { label: "Dokončeno", color: "bg-blue-500/20 text-blue-400" };
      case "expired":
        return { label: "Vypršelo", color: "bg-orange-500/20 text-orange-400" };
      case "cancelled":
        return { label: "Zrušeno", color: "bg-red-500/20 text-red-400" };
      default:
        return { label: status, color: "bg-slate-500/20 text-slate-400" };
    }
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📋 Správa poptávek</h1>
            <p className="text-slate-400">Celkem {requests.length} poptávek</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Hledat podle názvu, lokality nebo zákazníka..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Všechny" },
              { key: "active", label: "🟢 Aktivní" },
              { key: "completed", label: "✅ Dokončené" },
              { key: "expired", label: "⏰ Vypršelé" },
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Aktivní", value: requests.filter(r => r.status === "active").length, color: "text-emerald-400" },
            { label: "Dokončené", value: requests.filter(r => r.status === "completed").length, color: "text-blue-400" },
            { label: "Vypršelé", value: requests.filter(r => r.status === "expired").length, color: "text-orange-400" },
            { label: "S nabídkami", value: requests.filter(r => (r.offers_count || 0) > 0).length, color: "text-purple-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Žádné poptávky nenalezeny
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Poptávka</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Zákazník</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Kategorie</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Rozpočet</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Stav</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Nabídky</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRequests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    const days = daysLeft(request.expires_at);
                    
                    return (
                      <tr key={request.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{request.title}</p>
                            <p className="text-slate-500 text-sm">📍 {request.location}</p>
                            <p className="text-slate-600 text-xs mt-1">
                              {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                              {request.status === "active" && days > 0 && (
                                <span className={`ml-2 ${days <= 3 ? 'text-red-400' : 'text-slate-500'}`}>
                                  • Zbývá {days} dní
                                </span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm">{request.customer_name || "Neznámý"}</p>
                          <p className="text-slate-500 text-xs">{request.customer_email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">
                            {request.category_icon} {request.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {request.budget_min || request.budget_max ? (
                            <>
                              {request.budget_min?.toLocaleString()} 
                              {request.budget_min && request.budget_max && " - "}
                              {request.budget_max?.toLocaleString()} Kč
                            </>
                          ) : (
                            <span className="text-slate-500">Neuvedeno</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${(request.offers_count || 0) > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {request.offers_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/poptavka/${request.id}`}
                              target="_blank"
                              className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-sm hover:bg-white/10 hover:text-white transition-colors"
                            >
                              👁️
                            </Link>
                            <select
                              value={request.status}
                              onChange={(e) => handleStatusChange(request.id, e.target.value)}
                              className="px-3 py-1.5 bg-slate-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="active">Aktivní</option>
                              <option value="completed">Dokončeno</option>
                              <option value="expired">Vypršelo</option>
                              <option value="cancelled">Zrušeno</option>
                            </select>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                            >
                              🗑️
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