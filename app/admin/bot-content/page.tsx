"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

// Schéma bot_generated_content vlastní fachmani-bot projekt — používáme defensivně
// (status je jediný garantovaný filter, zbytek tolerantně typujeme).
// Spec: status='pending_review' → admin schválí → bot publikuje.

// bot_generated_content NEMÁ conversation_id sloupec — vazba je obrácená:
// bot_conversations.turn_{1,2,3}_content_id ukazují na bot_generated_content.id.
// Po načtení rows děláme reverse lookup do bot_conversations.
type ContentRow = {
  id: string;
  body: string | null;
  intent: string | null;
  status: string;
  generated_at: string | null;
  created_at: string | null;
  account_id: string | null;
  // Volitelné metadata sloupce — schéma je v bot projektu, dostupnost se může lišit:
  turn: number | string | null;
  content_type: string | null; // např. 'turn_1', 'turn_2', 'turn_3', 'standalone_post'
  model: string | null;
  tokens_used: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  knowledge_sections: string[] | string | null;
  rejected_reason: string | null; // sloupec v DB se jmenuje rejected_reason (NE rejection_reason)
  group_label: string | null;
  // Status-specific timestamps + audit refs (z migrace fachmani-bot):
  approved_at: string | null;
  approved_by: string | null;
  published_action_id: string | null;
  target_url: string | null;
};

type Conversation = {
  id: string;
  fb_post_url: string | null;
  extracted_topic: string | null;
  thread_state: string | null;
  account_id: string | null;
  turn_1_content_id: string | null;
  turn_2_content_id: string | null;
  turn_3_content_id: string | null;
  last_reply_text: string | null;
};

type Classification = {
  fb_post_url: string;
  category: string | null;
  extracted_topic: string | null;
  intent_strength: string | null;
  recommended_action: string | null;
};

type Account = { id: string; label: string | null; account_kind: string | null };

type BotAction = {
  id: string;
  action_type: string | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  actor_id: string | null;
  generated_content_id: string | null;
  target_url: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
};

const OWNER_ROLES = new Set(["master_admin", "admin"]);

type StatusKey = "pending_review" | "approved" | "published" | "rejected" | "all";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "pending_review", label: "Čekající (pending_review)" },
  { value: "approved", label: "Schválené (approved)" },
  { value: "published", label: "Publikované (published)" },
  { value: "rejected", label: "Odmítnuté (rejected)" },
  { value: "all", label: "Všechny stavy" },
];

const STATUS_COLOR: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  pending_review: { dot: "bg-yellow-400", bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/40", label: "pending_review" },
  approved:       { dot: "bg-blue-400",   bg: "bg-blue-500/15",   text: "text-blue-300",   border: "border-blue-500/40",   label: "approved" },
  published:      { dot: "bg-emerald-400",bg: "bg-emerald-500/15",text: "text-emerald-300",border: "border-emerald-500/40",label: "published" },
  rejected:       { dot: "bg-red-400",    bg: "bg-red-500/15",    text: "text-red-300",    border: "border-red-500/40",    label: "rejected" },
};

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

function deriveTurnLabel(c: ContentRow, conv: Conversation | null): string {
  if (c.content_type) return c.content_type;
  if (typeof c.turn === "number") return `turn_${c.turn}`;
  if (typeof c.turn === "string" && c.turn) return c.turn;
  if (conv) {
    if (conv.turn_1_content_id === c.id) return "turn_1";
    if (conv.turn_2_content_id === c.id) return "turn_2";
    if (conv.turn_3_content_id === c.id) return "turn_3";
  }
  // Žádná conversation = standalone post (bot_conversations row tu nikdy neexistuje)
  if (!conv) return "standalone_post";
  return "—";
}

function knowledgeAsArray(k: ContentRow["knowledge_sections"]): string[] {
  if (!k) return [];
  if (Array.isArray(k)) return k.filter((x): x is string => typeof x === "string");
  if (typeof k === "string") {
    try {
      const parsed = JSON.parse(k);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      return [k];
    }
  }
  return [];
}

function shortActor(actor: string | null | undefined): string {
  if (!actor) return "—";
  return actor.replace(/^admin:/, "").slice(0, 8) + "…";
}

type Action = "approve" | "edit" | "reject";

export default function AdminBotContentPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentRow[]>([]);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  // content_id → conversation_id (reverse lookup z bot_conversations.turn_{1,2,3}_content_id)
  const [contentToConv, setContentToConv] = useState<Record<string, string>>({});
  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Audit logy (per content_id, ASC podle started_at) + publish action lookup
  const [auditLogs, setAuditLogs] = useState<Record<string, BotAction[]>>({});
  const [publishActions, setPublishActions] = useState<Record<string, BotAction>>({});

  // Globální status counts (přes celou tabulku, nezávislé na ostatních filtrech)
  const [statusCounts, setStatusCounts] = useState<Record<StatusKey, number>>({
    pending_review: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    all: 0,
  });

  // Filtry
  const [filterStatus, setFilterStatus] = useState<StatusKey>("pending_review");
  const [filterAccount, setFilterAccount] = useState<string>("");
  const [filterTurn, setFilterTurn] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const reasonsRef = useRef(reasons);
  reasonsRef.current = reasons;

  const flashToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Status counts načítáme paralelně přes head:true count, separátně od list query.
  // To zachová "5 pending · 12 published · …" i když uživatel filtruje na konkrétní status.
  const loadStatusCounts = useCallback(async () => {
    const statuses: StatusKey[] = ["pending_review", "approved", "published", "rejected"];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase
          .from("bot_generated_content")
          .select("id", { count: "exact", head: true })
          .eq("status", s),
      ),
    );
    const next: Record<StatusKey, number> = {
      pending_review: 0,
      approved: 0,
      published: 0,
      rejected: 0,
      all: 0,
    };
    statuses.forEach((s, i) => {
      next[s] = results[i].count ?? 0;
    });
    next.all = next.pending_review + next.approved + next.published + next.rejected;
    setStatusCounts(next);
  }, []);

  const load = useCallback(async () => {
    // Sort: pending_review = FIFO (created_at ASC), ostatní = nejnovější první
    // (DESC by approved_at — sloupec se nastavuje při approve i reject; pro published
    // používáme bot_actions.completed_at, ale řazení listu je stále podle moderation timestamp).
    const sortColumn = filterStatus === "pending_review" ? "generated_at" : "approved_at";
    const sortAsc = filterStatus === "pending_review";

    let q = supabase.from("bot_generated_content").select("*");
    if (filterStatus !== "all") {
      q = q.eq("status", filterStatus);
    }
    const { data, error } = await q
      .order(sortColumn, { ascending: sortAsc, nullsFirst: false })
      .limit(200);

    if (error) {
      flashToast("err", `Chyba načítání: ${error.message}`);
      return;
    }
    const rows = ((data as ContentRow[]) || []).map((r) => ({
      ...r,
      created_at: r.created_at ?? r.generated_at ?? null,
    }));
    setItems(rows);

    // Reverse lookup: bot_conversations.turn_{1,2,3}_content_id → content.id.
    // bot_generated_content nemá conversation_id, vazbu drží bot_conversations.
    const contentIds = rows.map((r) => r.id).filter(Boolean) as string[];
    if (contentIds.length) {
      const idsCsv = contentIds.join(",");
      const { data: convs } = await supabase
        .from("bot_conversations")
        .select(
          "id, fb_post_url, extracted_topic, thread_state, account_id, turn_1_content_id, turn_2_content_id, turn_3_content_id, last_reply_text",
        )
        .or(
          `turn_1_content_id.in.(${idsCsv}),turn_2_content_id.in.(${idsCsv}),turn_3_content_id.in.(${idsCsv})`,
        );

      const convMap: Record<string, Conversation> = {};
      const c2c: Record<string, string> = {};
      const postUrls: string[] = [];
      for (const c of (convs as Conversation[]) || []) {
        convMap[c.id] = c;
        if (c.turn_1_content_id) c2c[c.turn_1_content_id] = c.id;
        if (c.turn_2_content_id) c2c[c.turn_2_content_id] = c.id;
        if (c.turn_3_content_id) c2c[c.turn_3_content_id] = c.id;
        if (c.fb_post_url) postUrls.push(c.fb_post_url);
      }
      setConversations(convMap);
      setContentToConv(c2c);

      if (postUrls.length) {
        const { data: cls } = await supabase
          .from("bot_post_classifications")
          .select("fb_post_url, category, extracted_topic, intent_strength, recommended_action")
          .in("fb_post_url", postUrls);
        const cmap: Record<string, Classification> = {};
        for (const c of (cls as Classification[]) || []) {
          cmap[c.fb_post_url] = c;
        }
        setClassifications(cmap);
      } else {
        setClassifications({});
      }

      // Audit log + publish actions — jednou v batchi pro všechny visible řádky.
      const { data: actions } = await supabase
        .from("bot_actions")
        .select("id, action_type, status, started_at, completed_at, actor_id, generated_content_id, target_url, payload, result")
        .in("generated_content_id", contentIds)
        .order("started_at", { ascending: true });

      const auditMap: Record<string, BotAction[]> = {};
      const publishMap: Record<string, BotAction> = {};
      for (const a of (actions as BotAction[]) || []) {
        if (!a.generated_content_id) continue;
        if (!auditMap[a.generated_content_id]) auditMap[a.generated_content_id] = [];
        auditMap[a.generated_content_id].push(a);
      }
      // publish action = ten, jehož id se shoduje s row.published_action_id
      // (alternativně poslední success comment/post action s result.published === true).
      for (const r of rows) {
        if (r.published_action_id) {
          const found = ((actions as BotAction[]) || []).find((a) => a.id === r.published_action_id);
          if (found) publishMap[r.id] = found;
        }
      }
      setAuditLogs(auditMap);
      setPublishActions(publishMap);
    } else {
      setConversations({});
      setContentToConv({});
      setClassifications({});
      setAuditLogs({});
      setPublishActions({});
    }

    const accountIds = Array.from(
      new Set(rows.map((r) => r.account_id).filter(Boolean) as string[]),
    );
    if (accountIds.length) {
      const { data: accs } = await supabase
        .from("bot_accounts")
        .select("id, label, account_kind")
        .in("id", accountIds);
      const amap: Record<string, Account> = {};
      for (const a of (accs as Account[]) || []) amap[a.id] = a;
      setAccounts(amap);
    }
  }, [filterStatus]);

  // Načti všechny accounty pro dropdown filter (jednorázově)
  const loadAccountsAll = useCallback(async () => {
    const { data } = await supabase
      .from("bot_accounts")
      .select("id, label, account_kind")
      .order("label", { ascending: true });
    setAccountList((data as Account[]) || []);
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
      await Promise.all([load(), loadAccountsAll(), loadStatusCounts()]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, loadAccountsAll, loadStatusCounts, router]);

  // Realtime subscription
  useEffect(() => {
    if (!authorized) return;
    const channel = supabase
      .channel("bot_generated_content_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_generated_content" },
        () => {
          load();
          loadStatusCounts();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, load, loadStatusCounts]);

  // Filtrace + odvozené turn labels
  const visible = useMemo(() => {
    return items.filter((r) => {
      if (filterAccount && r.account_id !== filterAccount) return false;
      if (filterTurn) {
        const convId = contentToConv[r.id];
        const turnLabel = deriveTurnLabel(r, convId ? conversations[convId] || null : null);
        if (turnLabel !== filterTurn) return false;
      }
      if (filterGroup && r.group_label !== filterGroup) return false;
      return true;
    });
  }, [items, conversations, contentToConv, filterAccount, filterTurn, filterGroup]);

  // Odlišné groupy v aktuálním datasetu (pro dropdown)
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) if (r.group_label) set.add(r.group_label);
    return Array.from(set).sort();
  }, [items]);

  const runAction = async (item: ContentRow, action: Action) => {
    if (busy[item.id]) return;
    setBusy((b) => ({ ...b, [item.id]: true }));
    try {
      if (action === "approve") {
        // RPC param je `content_id` (NE `p_content_id` — historický bug ve volání).
        const { error } = await supabase.rpc("approve_content", { content_id: item.id });
        if (error) throw error;
        flashToast("ok", "Obsah schválen.");
      } else if (action === "edit") {
        const text = (draftsRef.current[item.id] || "").trim();
        if (!text) {
          flashToast("err", "Editovaný text je prázdný.");
          setBusy((b) => ({ ...b, [item.id]: false }));
          return;
        }
        const { error } = await supabase.rpc("edit_and_approve_content", {
          content_id: item.id,
          new_text: text,
        });
        if (error) throw error;
        flashToast("ok", "Obsah editován a schválen.");
      } else {
        const reason = (reasonsRef.current[item.id] || "").trim();
        if (!reason) {
          flashToast("err", "Důvod odmítnutí je povinný.");
          setBusy((b) => ({ ...b, [item.id]: false }));
          return;
        }
        const { error } = await supabase.rpc("reject_content", {
          content_id: item.id,
          reason,
        });
        if (error) throw error;
        flashToast("ok", "Obsah odmítnut.");
      }
      await Promise.all([load(), loadStatusCounts()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      flashToast("err", `Akce selhala: ${msg}`);
    } finally {
      setBusy((b) => ({ ...b, [item.id]: false }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-slate-400">Načítám frontu schvalování…</div>
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
            <h1 className="text-2xl font-bold text-white">📝 Bot content — schvalování</h1>
            <p className="text-slate-400 text-sm mt-1">
              {filterStatus === "pending_review"
                ? <>Čekající obsah (<code className="text-cyan-300">pending_review</code>) — FIFO, nejstarší první.</>
                : filterStatus === "all"
                  ? <>Všechny stavy — řazeno podle posledního moderation kroku (DESC).</>
                  : <>Stav <code className="text-cyan-300">{filterStatus}</code> — nejnovější první.</>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-medium">
              {statusCounts.pending_review} pending
            </span>
            <span className="text-slate-600">·</span>
            <span className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              {statusCounts.published} published
            </span>
            <span className="text-slate-600">·</span>
            <span className="px-2 py-1 rounded-md bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-medium">
              {statusCounts.approved} approved
            </span>
            <span className="text-slate-600">·</span>
            <span className="px-2 py-1 rounded-md bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-medium">
              {statusCounts.rejected} rejected
            </span>
          </div>
        </header>

        {/* Filtry */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusKey)}
              className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Account</span>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="">Všechny</option>
              {accountList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label || a.id.slice(0, 8)}
                  {a.account_kind ? ` (${a.account_kind})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Turn / typ</span>
            <select
              value={filterTurn}
              onChange={(e) => setFilterTurn(e.target.value)}
              className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="">Všechny</option>
              <option value="turn_1">turn_1</option>
              <option value="turn_2">turn_2</option>
              <option value="turn_3">turn_3</option>
              <option value="standalone_post">standalone_post</option>
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Group</span>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="">Všechny</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </section>

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

        {visible.length === 0 ? (
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-10 text-center text-slate-400">
            {filterStatus === "pending_review"
              ? "🎉 Žádný obsah nečeká na schválení."
              : `Žádný obsah ve stavu ${filterStatus}.`}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((c) => {
              const convId = contentToConv[c.id] || null;
              const conv = convId ? conversations[convId] || null : null;
              const cls = conv?.fb_post_url ? classifications[conv.fb_post_url] || null : null;
              const account = c.account_id ? accounts[c.account_id] : null;
              const turnLabel = deriveTurnLabel(c, conv);
              const draft = drafts[c.id] ?? c.body ?? "";
              const reason = reasons[c.id] ?? "";
              const isEditing = !!editing[c.id];
              const isRejecting = !!rejecting[c.id];
              const isBusy = !!busy[c.id];
              const knowledge = knowledgeAsArray(c.knowledge_sections);
              const statusStyle = STATUS_COLOR[c.status] || STATUS_COLOR.pending_review;
              const audit = auditLogs[c.id] || [];
              const publishAction = publishActions[c.id] || null;
              const publishedAt = publishAction?.completed_at || null;
              const publishedFbUrl =
                (publishAction?.result &&
                  typeof publishAction.result === "object" &&
                  ((publishAction.result as { fb_post_url?: string }).fb_post_url ||
                    publishAction.target_url)) ||
                publishAction?.target_url ||
                c.target_url ||
                null;

              return (
                <article key={c.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                          {statusStyle.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-medium">
                          {turnLabel}
                        </span>
                        {account?.label && (
                          <span className="text-xs text-slate-400">via {account.label}</span>
                        )}
                        {c.intent && (
                          <span className="text-xs text-slate-400">intent: {c.intent}</span>
                        )}
                        {c.group_label && (
                          <span className="text-xs text-slate-400">group: {c.group_label}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        vygenerováno: {fmt(c.created_at || c.generated_at)}
                      </div>
                    </div>
                  </div>

                  {/* Originální FB post + classification */}
                  {(conv?.fb_post_url || cls) && (
                    <section className="rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        Originální FB post
                      </div>
                      {conv?.fb_post_url && (
                        <a
                          href={conv.fb_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-sm break-all underline"
                        >
                          {conv.fb_post_url}
                        </a>
                      )}
                      {cls && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {cls.category && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10">
                              kategorie: {cls.category}
                            </span>
                          )}
                          {cls.extracted_topic && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10">
                              téma: {cls.extracted_topic}
                            </span>
                          )}
                          {cls.intent_strength && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10">
                              intent: {cls.intent_strength}
                            </span>
                          )}
                          {cls.recommended_action && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10">
                              akce: {cls.recommended_action}
                            </span>
                          )}
                        </div>
                      )}
                      {conv?.last_reply_text && (
                        <div className="rounded bg-slate-800/60 border border-white/5 px-3 py-2 text-sm text-slate-300 whitespace-pre-wrap">
                          <span className="text-xs text-slate-500">Poslední reply druhé strany:{" "}</span>
                          {conv.last_reply_text}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Generated content body */}
                  <section className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-slate-500">
                      Vygenerovaný obsah
                    </div>
                    <div className="rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-slate-100 whitespace-pre-wrap">
                      {c.body || <em className="text-slate-500">prázdný obsah</em>}
                    </div>
                  </section>

                  {/* AI metadata */}
                  {(c.model || typeof c.tokens_used === "number" || knowledge.length > 0) && (
                    <section className="rounded-lg bg-slate-900/30 border border-white/5 px-3 py-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      {c.model && <span>model: <code className="text-slate-300">{c.model}</code></span>}
                      {typeof c.tokens_used === "number" && (
                        <span>tokens: <code className="text-slate-300">{c.tokens_used}</code></span>
                      )}
                      {(typeof c.prompt_tokens === "number" || typeof c.completion_tokens === "number") && (
                        <span>
                          {c.prompt_tokens != null && `prompt ${c.prompt_tokens}`}
                          {c.prompt_tokens != null && c.completion_tokens != null && " / "}
                          {c.completion_tokens != null && `completion ${c.completion_tokens}`}
                        </span>
                      )}
                      {knowledge.length > 0 && (
                        <span>
                          knowledge: {knowledge.slice(0, 4).map((k, i) => (
                            <code key={i} className="text-slate-300 mr-1">{k}</code>
                          ))}
                          {knowledge.length > 4 && <span>+{knowledge.length - 4}</span>}
                        </span>
                      )}
                    </section>
                  )}

                  {/* Per-status info panel */}
                  {c.status === "approved" && (
                    <section className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm text-blue-200 space-y-1">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>✅ Schváleno: <strong className="text-white">{fmt(c.approved_at)}</strong></span>
                        {c.approved_by && (
                          <span>kým: <code className="text-blue-100">{c.approved_by.replace(/^admin:/, "")}</code></span>
                        )}
                      </div>
                      <div className="text-xs text-blue-300/80">⏳ Čeká na publikaci botem</div>
                    </section>
                  )}

                  {c.status === "published" && (
                    <section className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-200 space-y-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>🚀 Publikováno: <strong className="text-white">{fmt(publishedAt || c.approved_at)}</strong></span>
                        {c.approved_by && (
                          <span>schválil: <code className="text-emerald-100">{c.approved_by.replace(/^admin:/, "")}</code></span>
                        )}
                      </div>
                      {publishedFbUrl && (
                        <div>
                          <a
                            href={publishedFbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 underline text-sm"
                          >
                            🔗 LIVE FB komentář
                            <span className="text-xs opacity-70">(otevřít v novém okně)</span>
                          </a>
                        </div>
                      )}
                      {audit.length > 0 && (
                        <details className="text-xs text-emerald-200/90">
                          <summary className="cursor-pointer hover:text-emerald-100">
                            📜 Audit log akcí ({audit.length})
                          </summary>
                          <ul className="mt-2 space-y-1 ml-2 border-l border-emerald-500/30 pl-3">
                            {audit.map((a) => (
                              <li key={a.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                                <span className="text-emerald-300/80">{fmt(a.completed_at || a.started_at)}</span>
                                <code className="text-emerald-100">{a.action_type || "—"}</code>
                                <span className={`text-xs ${a.status === "success" ? "text-emerald-300" : "text-red-300"}`}>
                                  {a.status || "—"}
                                </span>
                                {a.actor_id && (
                                  <span className="text-emerald-300/70">by {shortActor(a.actor_id)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </section>
                  )}

                  {c.status === "rejected" && (
                    <section className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-200 space-y-1">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>❌ Odmítnuto: <strong className="text-white">{fmt(c.approved_at)}</strong></span>
                        {c.approved_by && (
                          <span>kým: <code className="text-red-100">{c.approved_by.replace(/^admin:/, "")}</code></span>
                        )}
                      </div>
                      {c.rejected_reason && (
                        <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1.5 mt-1">
                          <span className="text-xs uppercase tracking-wider text-red-300/80">Důvod:</span>{" "}
                          <span className="text-red-100">{c.rejected_reason}</span>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Edit body (jen pending_review) */}
                  {c.status === "pending_review" && isEditing && (
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-500">
                        Upravený obsah
                      </label>
                      <textarea
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        rows={6}
                        className="w-full rounded-lg bg-slate-900/60 border border-white/10 focus:border-cyan-500/60 focus:outline-none px-3 py-2 text-sm text-white"
                      />
                    </div>
                  )}

                  {/* Reject reason (jen pending_review) */}
                  {c.status === "pending_review" && isRejecting && (
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-500">
                        Důvod odmítnutí
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) =>
                          setReasons((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-lg bg-slate-900/60 border border-red-500/30 focus:border-red-500/70 focus:outline-none px-3 py-2 text-sm text-white"
                        placeholder="Stručně proč obsah odmítáš (zaznamená se k auditu)."
                      />
                    </div>
                  )}

                  {/* Akce — jen pro pending_review */}
                  {c.status === "pending_review" && (
                    <div className="flex flex-wrap gap-2 justify-end pt-1 border-t border-white/5">
                      {!isEditing && !isRejecting && (
                        <>
                          <button
                            onClick={() => runAction(c, "approve")}
                            disabled={isBusy}
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() =>
                              setEditing((e) => ({ ...e, [c.id]: true }))
                            }
                            disabled={isBusy}
                            className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-sm font-medium"
                          >
                            ✏️ Edit + Approve
                          </button>
                          <button
                            onClick={() =>
                              setRejecting((r) => ({ ...r, [c.id]: true }))
                            }
                            disabled={isBusy}
                            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-medium"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {isEditing && (
                        <>
                          <button
                            onClick={() =>
                              setEditing((e) => ({ ...e, [c.id]: false }))
                            }
                            disabled={isBusy}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
                          >
                            Zrušit edit
                          </button>
                          <button
                            onClick={() => runAction(c, "edit")}
                            disabled={isBusy || !draft.trim()}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold"
                          >
                            Uložit + Approve
                          </button>
                        </>
                      )}
                      {isRejecting && (
                        <>
                          <button
                            onClick={() =>
                              setRejecting((r) => ({ ...r, [c.id]: false }))
                            }
                            disabled={isBusy}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
                          >
                            Zrušit
                          </button>
                          <button
                            onClick={() => runAction(c, "reject")}
                            disabled={isBusy || !reason.trim()}
                            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold"
                          >
                            Potvrdit reject
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="text-right">
                    {convId && (
                      <Link
                        href={`/admin/bot-flags`}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        conv: {convId.slice(0, 8)}…
                      </Link>
                    )}
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
