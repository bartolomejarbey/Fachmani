"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

// /admin/bot-monitor — read-only audit + bot_controls toggle panel.
// Sleduje: bot_heartbeats (last seen), bot_actions (recent), bot_conversations (active),
// bot_controls (toggle is_paused / mandatory_approval / beta_mode / active_phase).

type Heartbeat = {
  id: number | string;
  bot_id: string | null;
  account_id: string | null;
  current_action: string | null;
  beat_at: string | null;
  notes: string | null;
  cpu_percent: number | null;
  memory_mb: number | null;
  uptime_seconds: number | null;
  in_window: boolean | null;
  last_action_at: string | null;
};

type ActionRow = {
  id: string;
  bot_id: string | null;
  account_id: string | null;
  action_type: string | null;
  status: string | null;
  target_url: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type ConvRow = {
  id: string;
  thread_state: string | null;
  extracted_topic: string | null;
  fb_post_url: string | null;
  last_turn: number | null;
  account_id: string | null;
  updated_at: string | null;
};

type Account = { id: string; label: string | null; account_kind: string | null };

type ControlsRow = {
  bot_id: string;
  is_paused: boolean | null;
  mandatory_approval: boolean | null;
  beta_mode: boolean | null;
  active_phase: string | null;
  updated_at: string | null;
};

const OWNER_ROLES = new Set(["master_admin", "admin"]);

const ACTIVE_THREAD_STATES = new Set(["active", "engaged", "in_progress", "running", "open", "pending"]);
const PHASES = ["alpha", "beta", "production", "scale", "paused"] as const;

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relAge(iso: string | null): string {
  if (!iso) return "nikdy";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "v budoucnu";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `před ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `před ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `před ${hr} h`;
  const d = Math.round(hr / 24);
  return `před ${d} d`;
}

function heartbeatColor(hb: Heartbeat, now: number): string {
  const action = (hb.current_action || "").toLowerCase();
  if (action === "error" || action.startsWith("err")) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (action === "paused") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (!hb.beat_at) return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  const ageMin = (now - new Date(hb.beat_at).getTime()) / 60_000;
  if (ageMin > 10) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (ageMin > 3) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
}

export default function AdminBotMonitorPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [controls, setControls] = useState<ControlsRow | null>(null);
  const [savingControl, setSavingControl] = useState<string | null>(null);
  const [pendingPause, setPendingPause] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flashToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    const [hbRes, actRes, convRes, ctrlRes, accRes] = await Promise.all([
      supabase
        .from("bot_heartbeats")
        .select("*")
        .order("beat_at", { ascending: false })
        .limit(20),
      supabase
        .from("bot_actions")
        .select("id, bot_id, account_id, action_type, status, target_url, started_at, completed_at")
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("bot_conversations")
        .select("id, thread_state, extracted_topic, fb_post_url, last_turn, account_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase.from("bot_controls").select("*").limit(1).maybeSingle(),
      supabase.from("bot_accounts").select("id, label, account_kind"),
    ]);

    if (hbRes.error) console.warn("[bot-monitor] heartbeats:", hbRes.error.message);
    if (actRes.error) console.warn("[bot-monitor] actions:", actRes.error.message);
    if (convRes.error) console.warn("[bot-monitor] conversations:", convRes.error.message);
    if (ctrlRes.error) console.warn("[bot-monitor] controls:", ctrlRes.error.message);

    setHeartbeats((hbRes.data as Heartbeat[]) || []);
    setActions((actRes.data as ActionRow[]) || []);
    setConversations((convRes.data as ConvRow[]) || []);
    setControls((ctrlRes.data as ControlsRow) || null);

    const map: Record<string, Account> = {};
    for (const a of (accRes.data as Account[]) || []) map[a.id] = a;
    setAccounts(map);
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
      await load();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  // Auto-refresh každých 15 s pro live-feel; realtime pro controls.
  useEffect(() => {
    if (!authorized) return;
    const t = setInterval(() => {
      load();
    }, 15_000);
    const ctrlChannel = supabase
      .channel("bot_controls_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_controls" },
        () => load(),
      )
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ctrlChannel);
    };
  }, [authorized, load]);

  const now = Date.now();

  const activeConversations = useMemo(() => {
    return conversations.filter((c) =>
      c.thread_state ? ACTIVE_THREAD_STATES.has(c.thread_state) : false,
    );
  }, [conversations]);

  const updateControl = async (
    field: "is_paused" | "mandatory_approval" | "beta_mode" | "active_phase",
    value: boolean | string,
  ) => {
    if (!controls) {
      flashToast("err", "Tabulka bot_controls je prázdná. Vytvoř seed row v bot projektu.");
      return;
    }
    setSavingControl(field);
    try {
      const update: Record<string, boolean | string> = { [field]: value };
      if (!controls.bot_id) {
        throw new Error("bot_controls.bot_id chybí — singleton row nemá PK.");
      }
      const { error } = await supabase
        .from("bot_controls")
        .update(update)
        .eq("bot_id", controls.bot_id);
      if (error) throw error;
      flashToast("ok", `Uloženo: ${field} = ${value}.`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      flashToast("err", `Nepovedlo se uložit: ${msg}`);
    } finally {
      setSavingControl(null);
    }
  };

  const onPauseToggle = (next: boolean) => {
    setPendingPause(next);
  };

  const confirmPause = async () => {
    if (pendingPause === null) return;
    await updateControl("is_paused", pendingPause);
    setPendingPause(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-slate-400">Načítám monitor…</div>
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
        <header>
          <h1 className="text-2xl font-bold text-white">📡 Bot monitor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Read-only audit fachmani-bot stavu. Auto-refresh každých 15 s, realtime pro controls.
          </p>
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

        {/* CONTROLS */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-white">⚙️ Bot controls</h2>
            {controls?.updated_at && (
              <span className="text-xs text-slate-500">
                upraveno {fmt(controls.updated_at)}
              </span>
            )}
          </div>

          {!controls ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-300">
              bot_controls je prázdná — bot projekt by měl seedovat singleton row.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleControl
                label="Bot pozastaven (is_paused)"
                description="Zastaví všechny browser-side akce. Použij když je něco rozbité."
                value={!!controls.is_paused}
                disabled={savingControl !== null}
                requireConfirm
                onChange={onPauseToggle}
              />
              <ToggleControl
                label="Mandatory approval"
                description="Veškerý generovaný obsah jde do /admin/bot-content na schválení."
                value={!!controls.mandatory_approval}
                disabled={savingControl !== null}
                onChange={(v) => updateControl("mandatory_approval", v)}
              />
              <ToggleControl
                label="Beta mode"
                description="Beta-only featury (např. nové prompty, experimentální flow)."
                value={!!controls.beta_mode}
                disabled={savingControl !== null}
                onChange={(v) => updateControl("beta_mode", v)}
              />
              <label className="block space-y-1">
                <span className="text-sm font-medium text-white">Active phase</span>
                <select
                  value={controls.active_phase ?? ""}
                  disabled={savingControl !== null}
                  onChange={(e) => updateControl("active_phase", e.target.value)}
                  className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="">— nezvoleno —</option>
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Fáze běhu (alpha / beta / production / scale / paused).
                </p>
              </label>
            </div>
          )}
        </section>

        {/* HEARTBEATS */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-white">💓 Heartbeats</h2>
            <span className="text-xs text-slate-500">posledních {heartbeats.length}</span>
          </div>
          {heartbeats.length === 0 ? (
            <p className="text-slate-400 text-sm">Žádný heartbeat — bot pravděpodobně neběží.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {heartbeats.map((hb) => {
                const acc = hb.account_id ? accounts[hb.account_id] : null;
                const color = heartbeatColor(hb, now);
                return (
                  <li
                    key={hb.id}
                    className={`rounded-xl border px-3 py-3 ${color}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong className="text-sm">
                        {acc?.label || hb.bot_id?.slice(0, 12) || "neznámý"}
                      </strong>
                      <span className="text-xs">{hb.current_action || "—"}</span>
                    </div>
                    <div className="text-xs opacity-90">
                      beat: {fmt(hb.beat_at)} ({relAge(hb.beat_at)})
                    </div>
                    {hb.notes && (
                      <div className="text-xs mt-1 opacity-80 break-words">{hb.notes}</div>
                    )}
                    {(typeof hb.cpu_percent === "number" || typeof hb.memory_mb === "number" || typeof hb.uptime_seconds === "number") && (
                      <div className="text-xs mt-1 opacity-80 flex flex-wrap gap-x-2">
                        {typeof hb.cpu_percent === "number" && <span>CPU {hb.cpu_percent.toFixed(1)}%</span>}
                        {typeof hb.memory_mb === "number" && <span>RAM {hb.memory_mb} MB</span>}
                        {typeof hb.uptime_seconds === "number" && <span>up {Math.floor(hb.uptime_seconds / 60)} min</span>}
                        {hb.in_window === false && <span className="opacity-70">(out of window)</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ACTIVE CONVERSATIONS */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-white">💬 Aktivní konverzace</h2>
            <span className="text-xs text-slate-500">
              {activeConversations.length} aktivní · {conversations.length} celkem
            </span>
          </div>
          {activeConversations.length === 0 ? (
            <p className="text-slate-400 text-sm">Žádná aktivní konverzace.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Stav</th>
                    <th className="py-2 pr-4">Téma</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Turn</th>
                    <th className="py-2 pr-4">Updated</th>
                    <th className="py-2 pr-4">FB post</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {activeConversations.map((c) => {
                    const acc = c.account_id ? accounts[c.account_id] : null;
                    return (
                      <tr key={c.id} className="border-t border-white/5">
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs">
                            {c.thread_state || "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{c.extracted_topic || "—"}</td>
                        <td className="py-2 pr-4">{acc?.label || "—"}</td>
                        <td className="py-2 pr-4">{c.last_turn ?? "—"}</td>
                        <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">
                          {relAge(c.updated_at)}
                        </td>
                        <td className="py-2 pr-4">
                          {c.fb_post_url ? (
                            <a
                              href={c.fb_post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline"
                            >
                              ↗
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RECENT ACTIONS */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-white">📜 Recent bot_actions</h2>
            <span className="text-xs text-slate-500">posledních {actions.length}</span>
          </div>
          {actions.length === 0 ? (
            <p className="text-slate-400 text-sm">Žádné akce v audit logu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Kdy</th>
                    <th className="py-2 pr-4">Akce</th>
                    <th className="py-2 pr-4">Stav</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Target URL</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {actions.map((a) => {
                    const acc = a.account_id ? accounts[a.account_id] : null;
                    const isErr = (a.status || "").toLowerCase() === "error";
                    return (
                      <tr key={a.id} className="border-t border-white/5">
                        <td className="py-2 pr-4 whitespace-nowrap text-slate-400">
                          {fmt(a.started_at)}
                        </td>
                        <td className="py-2 pr-4 font-mono text-cyan-300">{a.action_type || "—"}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs ${
                              isErr
                                ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {a.status || "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{acc?.label || "—"}</td>
                        <td className="py-2 pr-4 max-w-md truncate" title={a.target_url ?? ""}>
                          {a.target_url || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation modal pro is_paused toggle */}
      {pendingPause !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPendingPause(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              {pendingPause ? "Pozastavit bota?" : "Spustit bota?"}
            </h3>
            <p className="text-sm text-slate-300">
              {pendingPause
                ? "Bot okamžitě zastaví všechny browser akce. Použij jen pokud je něco rozbité."
                : "Bot začne znovu zpracovávat fronty (heartbeats / actions / conversations)."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingPause(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
              >
                Zrušit
              </button>
              <button
                onClick={confirmPause}
                disabled={savingControl !== null}
                className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                  pendingPause
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-white"
                }`}
              >
                {pendingPause ? "Potvrdit pause" : "Potvrdit start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function ToggleControl({
  label,
  description,
  value,
  disabled,
  requireConfirm,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  requireConfirm?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-lg bg-slate-900/40 border border-white/5 p-3 flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        aria-pressed={value}
        title={requireConfirm ? "Vyžaduje potvrzení" : ""}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 ${
          value ? "bg-cyan-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
