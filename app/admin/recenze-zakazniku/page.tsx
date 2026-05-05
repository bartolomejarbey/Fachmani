"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import Link from "next/link";

type CustomerReview = {
  id: string;
  rating: number;
  rating_reliability: number | null;
  rating_communication: number | null;
  rating_payment: number | null;
  comment: string | null;
  created_at: string;
  request_id: string;
  provider_id: string;
  customer_id: string;
  provider_name?: string;
  customer_name?: string;
  customer_email?: string;
};

type FilterKey = "all" | "low" | "high" | "no_comment" | "recent";

export default function AdminRecenzeZakazniku() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_reviews")
      .select(
        "id, rating, rating_reliability, rating_communication, rating_payment, comment, created_at, request_id, provider_id, customer_id, provider:provider_id(full_name), customer:customer_id(full_name, email)"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setMessage(`❌ ${error.message}`);
      setLoading(false);
      return;
    }

    type RawRow = Omit<CustomerReview, "provider_name" | "customer_name" | "customer_email"> & {
      provider: { full_name: string | null } | null;
      customer: { full_name: string | null; email: string | null } | null;
    };

    const rows: CustomerReview[] = ((data as unknown as RawRow[] | null) ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      rating_reliability: r.rating_reliability,
      rating_communication: r.rating_communication,
      rating_payment: r.rating_payment,
      comment: r.comment,
      created_at: r.created_at,
      request_id: r.request_id,
      provider_id: r.provider_id,
      customer_id: r.customer_id,
      provider_name: r.provider?.full_name ?? undefined,
      customer_name: r.customer?.full_name ?? undefined,
      customer_email: r.customer?.email ?? undefined,
    }));

    setReviews(rows);
    setLoading(false);
  };

  const handleDelete = async (id: string, customerName: string | undefined) => {
    if (!confirm(`Opravdu smazat hodnocení zákazníka ${customerName || ""}?`)) return;

    const { error } = await supabase.from("customer_reviews").delete().eq("id", id);
    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "delete_customer_review",
      target_type: "customer_review",
      target_id: id,
      details: { customer_name: customerName },
    });

    setMessage("✅ Hodnocení smazáno.");
    await load();
  };

  const ageInDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.provider_name?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q);

    if (filter === "low") return matchesSearch && r.rating <= 2;
    if (filter === "high") return matchesSearch && r.rating >= 5;
    if (filter === "no_comment") return matchesSearch && !r.comment?.trim();
    if (filter === "recent") return matchesSearch && ageInDays(r.created_at) <= 7;
    return matchesSearch;
  });

  const counts = {
    total: reviews.length,
    low: reviews.filter((r) => r.rating <= 2).length,
    high: reviews.filter((r) => r.rating >= 5).length,
    noComment: reviews.filter((r) => !r.comment?.trim()).length,
    recent: reviews.filter((r) => ageInDays(r.created_at) <= 7).length,
  };

  const ratingColor = (r: number) =>
    r <= 2 ? "text-red-400" : r === 3 ? "text-amber-400" : "text-emerald-400";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⭐ Recenze zákazníků</h1>
          <p className="text-slate-400">
            Hodnocení zákazníků fachmany. Celkem {counts.total} · {counts.low} nízkých (≤2★) · {counts.high} extrémně vysokých (5★) · {counts.noComment} bez komentáře · {counts.recent} za poslední týden
          </p>
        </div>

        {message && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Hledat (jméno fachmana, zákazníka, text recenze)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { key: "all", label: `Vše (${counts.total})` },
                { key: "low", label: `🔴 Nízké (${counts.low})` },
                { key: "high", label: `🌟 5★ (${counts.high})` },
                { key: "no_comment", label: `💬 Bez textu (${counts.noComment})` },
                { key: "recent", label: `🆕 Týden (${counts.recent})` },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === f.key ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Načítám...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Žádné recenze v tomto filtru.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((r) => (
                <div key={r.id} className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-lg font-bold ${ratingColor(r.rating)}`}>
                          {"★".repeat(r.rating)}
                          <span className="text-slate-700">{"★".repeat(5 - r.rating)}</span>
                        </span>
                        {r.rating_reliability !== null && (
                          <span className="text-xs text-slate-500">
                            (Sp: {r.rating_reliability} · Ko: {r.rating_communication} · Pl: {r.rating_payment})
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleString("cs-CZ")}
                        </span>
                        {ageInDays(r.created_at) <= 7 && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                            🆕 nové
                          </span>
                        )}
                      </div>

                      <div className="text-sm mb-2">
                        <Link
                          href={`/fachman/${r.provider_id}`}
                          target="_blank"
                          className="text-cyan-300 hover:text-cyan-200 font-semibold"
                        >
                          {r.provider_name || "(neznámý fachman)"}
                        </Link>
                        <span className="text-slate-500 mx-2">→</span>
                        <span className="text-slate-300">{r.customer_name || "(neznámý zákazník)"}</span>
                        {r.customer_email && (
                          <span className="text-xs text-slate-500 ml-2">{r.customer_email}</span>
                        )}
                      </div>

                      {r.comment ? (
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{r.comment}</p>
                      ) : (
                        <p className="text-slate-600 text-sm italic">(bez komentáře)</p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/poptavka/${r.request_id}`}
                        target="_blank"
                        className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                        title="Zobrazit poptávku"
                      >
                        👁️ Poptávka
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id, r.customer_name)}
                        className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                      >
                        🗑️ Smazat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
