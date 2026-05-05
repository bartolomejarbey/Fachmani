"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type FlagRow = {
  id: string;
  conversation_id: string | null;
  account_id: string | null;
  fb_comment_url: string | null;
  reply_author_name: string | null;
  reply_text: string | null;
  flag_reason: string | null;
  flag_confidence: number | null;
  ai_suggestion: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
};

type AccountLabel = { id: string; label: string | null };

type Action = "ignore" | "abort" | "submit";

const OWNER_ROLES = new Set(["master_admin", "admin"]);

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `před ${hr} h`;
  const d = Math.round(hr / 24);
  return `před ${d} d`;
}

export default function AdminBotFlagsPage() {
  const router = useRouter();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const loadFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from("bot_flagged_replies")
      .select(
        "id, conversation_id, account_id, fb_comment_url, reply_author_name, reply_text, flag_reason, flag_confidence, ai_suggestion, status, created_at, notified_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      setToast({ kind: "err", msg: `Chyba načítání: ${error.message}` });
      return;
    }
    const rows = (data as FlagRow[]) || [];
    setFlags(rows);
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const r of rows) {
        next[r.id] = prev[r.id] ?? r.ai_suggestion ?? "";
      }
      return next;
    });

    const accountIds = Array.from(new Set(rows.map((r) => r.account_id).filter(Boolean))) as string[];
    if (accountIds.length) {
      const { data: accs } = await supabase
        .from("bot_accounts")
        .select("id, label")
        .in("id", accountIds);
      const map: Record<string, string> = {};
      for (const a of (accs as AccountLabel[]) || []) {
        if (a.label) map[a.id] = a.label;
      }
      setAccounts(map);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("admin_role")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const role = (profile as { admin_role?: string } | null)?.admin_role || "";
      if (!OWNER_ROLES.has(role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      await loadFlags();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFlags, router]);

  useEffect(() => {
    if (!authorized) return;
    const channel = supabase
      .channel("bot_flagged_replies_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_flagged_replies" },
        () => {
          loadFlags();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, loadFlags]);

  const counts = useMemo(() => {
    const stale = flags.filter((f) => Date.now() - new Date(f.created_at).getTime() > 30 * 60_000).length;
    return { total: flags.length, stale };
  }, [flags]);

  const flashToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const runAction = async (flag: FlagRow, action: Action) => {
    if (busy[flag.id]) return;
    setBusy((b) => ({ ...b, [flag.id]: true }));
    try {
      if (action === "ignore") {
        const { error } = await supabase.rpc("ignore_flagged_reply", { p_flag_id: flag.id });
        if (error) throw error;
        flashToast("ok", "Flag označen jako Ignore.");
      } else if (action === "abort") {
        if (!confirm("Opravdu ukončit konverzaci a označit flag jako abort?")) {
          setBusy((b) => ({ ...b, [flag.id]: false }));
          return;
        }
        const { error } = await supabase.rpc("mark_aborted_flagged_reply", { p_flag_id: flag.id });
        if (error) throw error;
        flashToast("ok", "Konverzace ukončena.");
      } else if (action === "submit") {
        const text = (draftsRef.current[flag.id] || "").trim();
        if (!text) {
          flashToast("err", "Reply text je prázdný.");
          setBusy((b) => ({ ...b, [flag.id]: false }));
          return;
        }
        const { error } = await supabase.rpc("submit_human_reply", {
          p_flag_id: flag.id,
          p_reply_text: text,
        });
        if (error) throw error;
        flashToast("ok", "Reply odeslán k publikaci.");
      }
      await loadFlags();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      flashToast("err", `Akce selhala: ${msg}`);
    } finally {
      setBusy((b) => ({ ...b, [flag.id]: false }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-slate-400">Načítám flag-y…</div>
      </AdminLayout>
    );
  }

  if (authorized === false) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-300">
          Tato sekce je dostupná pouze owner / admin rolím.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">🤖 Bot flag-y</h1>
            <p className="text-slate-400 text-sm mt-1">
              Reply, které fachmani-bot nedovedl klasifikovat. Vyřešené flag-y zmizí ze seznamu (FIFO).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-sm">
              <strong className="text-white">{counts.total}</strong> pending
            </span>
            {counts.stale > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm">
                {counts.stale} starších než 30 min
              </span>
            )}
          </div>
        </header>

        {toast && (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              toast.kind === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {flags.length === 0 ? (
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-10 text-center text-slate-400">
            🎉 Žádné nevyřešené flag-y. Bot zvládá konverzaci sám.
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => {
              const accLabel = flag.account_id ? accounts[flag.account_id] : null;
              const draft = drafts[flag.id] ?? "";
              const isBusy = !!busy[flag.id];
              return (
                <article
                  key={flag.id}
                  className="bg-slate-800/50 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">
                          {flag.reply_author_name || "Neznámý autor"}
                        </span>
                        {accLabel && (
                          <span className="text-xs text-slate-500">via {accLabel}</span>
                        )}
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs text-slate-400" title={fmtDateTime(flag.created_at)}>
                          {relativeAge(flag.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        {flag.flag_reason && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {flag.flag_reason}
                          </span>
                        )}
                        {typeof flag.flag_confidence === "number" && (
                          <span>conf {Math.round(flag.flag_confidence * 100)}%</span>
                        )}
                        {flag.fb_comment_url && (
                          <a
                            href={flag.fb_comment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 underline"
                          >
                            FB komentář ↗
                          </a>
                        )}
                        <Link
                          href={`/admin/bot-flags/${flag.id}`}
                          className="text-slate-300 hover:text-white underline"
                        >
                          Detail / kontext →
                        </Link>
                      </div>
                    </div>
                  </div>

                  {flag.reply_text && (
                    <div className="mb-3">
                      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Reply text</div>
                      <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 text-sm text-slate-200 whitespace-pre-wrap">
                        {flag.reply_text}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      htmlFor={`draft-${flag.id}`}
                      className="text-xs uppercase tracking-wider text-slate-500 mb-1 block"
                    >
                      AI návrh (uprav před odesláním)
                    </label>
                    <textarea
                      id={`draft-${flag.id}`}
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [flag.id]: e.target.value }))
                      }
                      rows={4}
                      className="w-full rounded-lg bg-slate-900/60 border border-white/10 focus:border-cyan-500/60 focus:outline-none px-3 py-2 text-sm text-white placeholder-slate-500"
                      placeholder="Žádný návrh — napiš odpověď ručně."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => runAction(flag, "ignore")}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      Ignore
                    </button>
                    <button
                      onClick={() => runAction(flag, "abort")}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-50 text-red-300 text-sm font-medium"
                    >
                      Ukončit konverzaci
                    </button>
                    <button
                      onClick={() => runAction(flag, "submit")}
                      disabled={isBusy || !draft.trim()}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-white text-sm font-semibold"
                    >
                      Odeslat reply
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
