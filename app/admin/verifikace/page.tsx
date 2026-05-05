"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useAdminActions } from "../hooks/useAdminActions";

type VerificationRow = {
  id: string;
  full_name: string;
  email: string;
  ico: string | null;
  is_verified: boolean;
  ares_verified_at: string | null;
  ares_verified_name: string | null;
  created_at: string;
  bank_account: string | null;
  bank_verification_status: string | null;
  bank_verification_amount: number | null;
  bank_verification_reference: string | null;
  bank_verification_initiated_at: string | null;
};

export default function AdminVerifikace() {
  const { handleVerify: sharedHandleVerify, logAction } = useAdminActions();
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "ares" | "approved">("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, ico, is_verified, ares_verified_at, ares_verified_name, created_at, bank_account, bank_verification_status, bank_verification_amount, bank_verification_reference, bank_verification_initiated_at")
      .eq("role", "provider")
      .order("ares_verified_at", { ascending: false, nullsFirst: false });
    setRows((data as VerificationRow[]) || []);
    setLoading(false);
  };

  const approve = async (id: string) => {
    await sharedHandleVerify(id, true, load);
    setMessage("Účet schválen.");
  };
  const unapprove = async (id: string) => {
    await sharedHandleVerify(id, false, load);
    setMessage("Ověření zrušeno.");
  };

  const confirmBank = async (id: string, status: "verified" | "failed") => {
    const res = await fetch("/api/admin/bank-verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Chyba při potvrzení banky");
      return;
    }
    setMessage(status === "verified" ? "💳 Bankovní ověření potvrzeno." : "💳 Bankovní ověření označeno jako neúspěšné.");
    await load();
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const closeReject = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectingId) return;
    if (rejectReason.trim().length < 10) {
      setMessage("Důvod musí mít alespoň 10 znaků.");
      return;
    }
    setRejectSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/verifikace/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: rejectingId, reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "Chyba při zamítnutí"}`);
      } else if (data.email_sent) {
        setMessage(`✅ Zamítnutí uloženo, email odeslán na uživatele.`);
      } else {
        setMessage(`⚠️ Zamítnutí uloženo, ale email se neodeslal: ${data.email_error || "neznámá chyba"}`);
      }
      closeReject();
      await load();
    } finally {
      setRejectSubmitting(false);
    }
  };

  const reverifyAres = async (id: string, ico: string) => {
    if (!ico) return;
    // Admin spustí server-side lookup přes stejný endpoint pod uživatelským účtem cíle
    // Pro admin context voláme /api/ares/lookup (nemění profil cíle, jen zobrazí data)
    const res = await fetch("/api/ares/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ico }),
    });
    const data = (await res.json()) as {
      result?: { status: string; name?: string; message?: string };
      error?: string;
    };
    if (data.result?.status === "ok" && data.result.name) {
      await supabase
        .from("profiles")
        .update({
          ares_verified_at: new Date().toISOString(),
          ares_verified_name: data.result.name,
        })
        .eq("id", id);
      await logAction("admin_reverify_ares", "user", id, { ico });
      await load();
      setMessage(`ARES re-check OK: ${data.result.name}`);
    } else {
      setMessage(data.error || "ARES re-check selhal.");
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.ico?.includes(q);

    if (filter === "pending") return matchesSearch && !!r.ares_verified_at && !r.is_verified;
    if (filter === "ares") return matchesSearch && !!r.ares_verified_at;
    if (filter === "approved") return matchesSearch && r.is_verified;
    return matchesSearch;
  });

  const counts = {
    total: rows.length,
    ares: rows.filter((r) => r.ares_verified_at).length,
    pending: rows.filter((r) => r.ares_verified_at && !r.is_verified).length,
    approved: rows.filter((r) => r.is_verified).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🛡️ Verifikace (ARES)</h1>
          <p className="text-slate-400">
            Celkem {counts.total} fachmanů · {counts.ares} s ARES ověřením · {counts.pending} čeká na schválení · {counts.approved} schváleno
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
            placeholder="Hledat (jméno, email, IČO)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "pending", label: `⏳ Čeká (${counts.pending})` },
              { key: "ares", label: `🏢 Má ARES (${counts.ares})` },
              { key: "approved", label: `✅ Schváleno (${counts.approved})` },
              { key: "all", label: "Vše" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === f.key ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {rejectingId && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closeReject}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full"
            >
              <h2 className="text-xl font-bold text-white mb-2">❌ Zamítnout ověření</h2>
              <p className="text-sm text-slate-400 mb-4">
                Důvod bude uložen do activity logu a odeslán uživateli emailem (Resend).
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={5}
                placeholder="Např. ARES neeviduje vaše IČO. Prosím doplňte správné IČO ve vašem profilu a zažádejte znovu."
                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                {rejectReason.trim().length}/10 znaků min.
              </p>
              <div className="flex gap-3 mt-4 justify-end">
                <button
                  onClick={closeReject}
                  disabled={rejectSubmitting}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Zrušit
                </button>
                <button
                  onClick={submitReject}
                  disabled={rejectSubmitting || rejectReason.trim().length < 10}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {rejectSubmitting ? "Odesílám..." : "Zamítnout & poslat email"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Načítám...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Žádné záznamy.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((r) => (
                <div key={r.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{r.full_name || "(bez jména)"}</span>
                      {r.is_verified && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                          ✓ schváleno
                        </span>
                      )}
                      {r.ares_verified_at && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                          ARES {new Date(r.ares_verified_at).toLocaleDateString("cs-CZ")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">{r.email}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      IČO: <span className="text-slate-300 font-mono">{r.ico || "—"}</span>
                      {r.ares_verified_name && (
                        <>
                          {" · "}ARES jméno: <span className="text-slate-300">{r.ares_verified_name}</span>
                        </>
                      )}
                    </div>
                    {r.bank_verification_status === "pending" && (
                      <div className="mt-2 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-lg px-3 py-2">
                        💳 <strong>Pending bank ověření</strong> — účet{" "}
                        <span className="font-mono">{r.bank_account}</span>, částka{" "}
                        <span className="font-mono">
                          {r.bank_verification_amount ? (r.bank_verification_amount / 100).toFixed(2) : "—"} Kč
                        </span>
                        , VS <span className="font-mono">{r.bank_verification_reference}</span>
                      </div>
                    )}
                    {r.bank_verification_status === "verified" && (
                      <div className="mt-2 text-xs text-emerald-300">
                        ✅ Bank účet ověřen ({r.bank_account})
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {r.ico && (
                      <button
                        onClick={() => reverifyAres(r.id, r.ico!)}
                        className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                      >
                        🔄 Re-check ARES
                      </button>
                    )}
                    {r.bank_verification_status === "pending" && (
                      <>
                        <button
                          onClick={() => confirmBank(r.id, "verified")}
                          className="px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          💳 Potvrdit bank
                        </button>
                        <button
                          onClick={() => confirmBank(r.id, "failed")}
                          className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                        >
                          ✗ Bank fail
                        </button>
                      </>
                    )}
                    {!r.is_verified ? (
                      <>
                        <button
                          onClick={() => approve(r.id)}
                          className="px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                          ✓ Schválit
                        </button>
                        <button
                          onClick={() => openReject(r.id)}
                          className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                          title="Zamítnout s důvodem (uživatel obdrží email)"
                        >
                          ❌ Zamítnout
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => unapprove(r.id)}
                        className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                      >
                        ✗ Zrušit
                      </button>
                    )}
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
