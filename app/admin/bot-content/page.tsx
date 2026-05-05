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
  rejection_reason: string | null;
  group_label: string | null;
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

const OWNER_ROLES = new Set(["master_admin", "admin"]);

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

  // Filtry
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

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bot_generated_content")
      .select("*")
      .eq("status", "pending_review")
      .order("generated_at", { ascending: true })
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
    } else {
      setConversations({});
      setContentToConv({});
      setClassifications({});
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
  }, []);

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
      await Promise.all([load(), loadAccountsAll()]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, loadAccountsAll, router]);

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
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, load]);

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
        const { error } = await supabase.rpc("approve_content", { p_content_id: item.id });
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
          p_content_id: item.id,
          p_new_body: text,
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
          p_content_id: item.id,
          p_reason: reason,
        });
        if (error) throw error;
        flashToast("ok", "Obsah odmítnut.");
      }
      await load();
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
              Vygenerovaný obsah ve stavu <code className="text-cyan-300">pending_review</code> čeká na ruční schválení.
              Default sort FIFO (nejstarší první).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-sm">
              <strong className="text-white">{visible.length}</strong>
              {visible.length !== items.length && (
                <span className="text-slate-500"> / {items.length}</span>
              )}
              {" "}pending
            </span>
          </div>
        </header>

        {/* Filtry */}
        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
            🎉 Žádný obsah nečeká na schválení.
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

              return (
                <article key={c.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Edit body */}
                  {isEditing && (
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

                  {/* Reject reason */}
                  {isRejecting && (
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

                  {/* Akce */}
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
