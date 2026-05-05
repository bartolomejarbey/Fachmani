"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../../components/AdminLayout";

type FlagRow = {
  id: string;
  conversation_id: string | null;
  account_id: string | null;
  bot_id: string | null;
  fb_comment_url: string | null;
  reply_author_name: string | null;
  reply_text: string | null;
  flag_reason: string | null;
  flag_confidence: number | null;
  ai_suggestion: string | null;
  status: string;
  human_reply_text: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  published_at: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  fb_post_url: string | null;
  thread_state: string | null;
  abort_reason: string | null;
  extracted_topic: string | null;
  alternative_required: boolean | null;
  last_turn: number | null;
  last_reply_text: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string | null;
  account_id: string | null;
  turn_1_content_id: string | null;
  turn_2_content_id: string | null;
  turn_3_content_id: string | null;
};

type GeneratedContent = {
  id: string;
  body: string | null;
  intent: string | null;
  generated_at: string | null;
  status: string | null;
};

type Turn = { n: number; body: string | null; intent: string | null; generated_at: string | null };

type Classification = {
  category: string | null;
  extracted_topic: string | null;
  intent_strength: string | null;
  has_drama: boolean | null;
  already_solved: boolean | null;
  recommended_action: string | null;
  classified_at: string | null;
  classified_by_model: string | null;
};

type Account = {
  id: string;
  label: string | null;
  account_kind: string | null;
};

const OWNER_ROLES = new Set(["master_admin", "admin"]);

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("cs-CZ");
}


export default function AdminBotFlagDetail() {
  const params = useParams<{ flagId: string }>();
  const flagId = params?.flagId;
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [flag, setFlag] = useState<FlagRow | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lastReplyTurn, setLastReplyTurn] = useState<{ text: string; at: string | null } | null>(null);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"ignore" | "abort" | "submit" | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flashToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    if (!flagId) return;
    const { data: f, error: fe } = await supabase
      .from("bot_flagged_replies")
      .select(
        "id, conversation_id, account_id, bot_id, fb_comment_url, reply_author_name, reply_text, flag_reason, flag_confidence, ai_suggestion, status, human_reply_text, resolved_at, resolved_by, published_at, created_at",
      )
      .eq("id", flagId)
      .single();
    if (fe || !f) {
      flashToast("err", fe?.message || "Flag nenalezen");
      return;
    }
    const flagRow = f as FlagRow;
    setFlag(flagRow);
    setDraft((prev) => (prev ? prev : flagRow.ai_suggestion || ""));

    if (flagRow.conversation_id) {
      const { data: c } = await supabase
        .from("bot_conversations")
        .select(
          "id, fb_post_url, thread_state, abort_reason, extracted_topic, alternative_required, last_turn, last_reply_text, last_reply_at, created_at, updated_at, account_id, turn_1_content_id, turn_2_content_id, turn_3_content_id",
        )
        .eq("id", flagRow.conversation_id)
        .maybeSingle();
      const conv = (c as Conversation) || null;
      setConversation(conv);

      if (conv) {
        const turnIds = [
          { n: 1, id: conv.turn_1_content_id },
          { n: 2, id: conv.turn_2_content_id },
          { n: 3, id: conv.turn_3_content_id },
        ].filter((t) => !!t.id) as { n: number; id: string }[];
        if (turnIds.length) {
          const { data: contents } = await supabase
            .from("bot_generated_content")
            .select("id, body, intent, generated_at, status")
            .in("id", turnIds.map((t) => t.id));
          const byId = new Map<string, GeneratedContent>();
          for (const r of (contents as GeneratedContent[]) || []) byId.set(r.id, r);
          setTurns(
            turnIds.map((t) => {
              const c = byId.get(t.id);
              return {
                n: t.n,
                body: c?.body ?? null,
                intent: c?.intent ?? null,
                generated_at: c?.generated_at ?? null,
              };
            }),
          );
        } else {
          setTurns([]);
        }
        if (conv.last_reply_text) {
          setLastReplyTurn({ text: conv.last_reply_text, at: conv.last_reply_at });
        } else {
          setLastReplyTurn(null);
        }
      }

      if (conv?.fb_post_url) {
        const { data: cls } = await supabase
          .from("bot_post_classifications")
          .select(
            "category, extracted_topic, intent_strength, has_drama, already_solved, recommended_action, classified_at, classified_by_model",
          )
          .eq("fb_post_url", conv.fb_post_url)
          .maybeSingle();
        setClassification((cls as Classification) || null);
      }
    }

    if (flagRow.account_id) {
      const { data: acc } = await supabase
        .from("bot_accounts")
        .select("id, label, account_kind")
        .eq("id", flagRow.account_id)
        .maybeSingle();
      setAccount((acc as Account) || null);
    }
  }, [flagId]);

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

  useEffect(() => {
    if (!authorized || !flagId) return;
    const channel = supabase
      .channel(`bot_flag_${flagId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bot_flagged_replies", filter: `id=eq.${flagId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, flagId, load]);

  const runAction = async (action: "ignore" | "abort" | "submit") => {
    if (!flag || busy) return;
    setBusy(action);
    try {
      if (action === "ignore") {
        const { error } = await supabase.rpc("ignore_flagged_reply", { p_flag_id: flag.id });
        if (error) throw error;
        flashToast("ok", "Označeno jako Ignore.");
      } else if (action === "abort") {
        if (!confirm("Opravdu ukončit konverzaci?")) {
          setBusy(null);
          return;
        }
        const { error } = await supabase.rpc("mark_aborted_flagged_reply", { p_flag_id: flag.id });
        if (error) throw error;
        flashToast("ok", "Konverzace ukončena.");
      } else {
        const text = draft.trim();
        if (!text) {
          flashToast("err", "Reply je prázdný.");
          setBusy(null);
          return;
        }
        const { error } = await supabase.rpc("submit_human_reply", {
          p_flag_id: flag.id,
          p_reply_text: text,
        });
        if (error) throw error;
        flashToast("ok", "Reply odeslán k publikaci.");
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      flashToast("err", `Akce selhala: ${msg}`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-slate-400">Načítám detail…</div>
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
  if (!flag) {
    return (
      <AdminLayout>
        <div className="text-slate-400">Flag nenalezen.</div>
      </AdminLayout>
    );
  }

  const isResolved = flag.status !== "pending";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/bot-flags" className="text-cyan-400 hover:text-cyan-300 text-sm">
            ← Zpět na seznam
          </Link>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-500">Flag {flag.id.slice(0, 8)}</span>
        </div>

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

        <header className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">
              Flag — {flag.reply_author_name || "neznámý autor"}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                flag.status === "pending"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : flag.status === "resolved"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-slate-500/20 text-slate-300 border-slate-500/30"
              }`}
            >
              {flag.status}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>vytvořeno: {fmt(flag.created_at)}</span>
            {flag.resolved_at && <span>vyřešeno: {fmt(flag.resolved_at)}</span>}
            {flag.published_at && <span>publikováno: {fmt(flag.published_at)}</span>}
            {account?.label && <span>account: {account.label}</span>}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {flag.flag_reason && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {flag.flag_reason}
              </span>
            )}
            {typeof flag.flag_confidence === "number" && (
              <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                confidence {Math.round(flag.flag_confidence * 100)}%
              </span>
            )}
            {flag.fb_comment_url && (
              <a
                href={flag.fb_comment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
              >
                FB komentář ↗
              </a>
            )}
            {conversation?.fb_post_url && (
              <a
                href={conversation.fb_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
              >
                FB post ↗
              </a>
            )}
          </div>
        </header>

        {classification && (
          <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Klasifikace původního postu</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Row label="Kategorie" value={classification.category} />
              <Row label="Téma" value={classification.extracted_topic} />
              <Row label="Síla intentu" value={classification.intent_strength} />
              <Row label="Doporučená akce" value={classification.recommended_action} />
              <Row label="Drama" value={classification.has_drama ? "ano" : "ne"} />
              <Row label="Už vyřešeno" value={classification.already_solved ? "ano" : "ne"} />
              <Row label="Klasifikace" value={fmt(classification.classified_at)} />
              <Row label="Model" value={classification.classified_by_model} />
            </dl>
          </section>
        )}

        {conversation && (
          <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Stav konverzace</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Row label="Stav" value={conversation.thread_state} />
              <Row label="Téma" value={conversation.extracted_topic} />
              <Row label="Last turn" value={conversation.last_turn?.toString() ?? null} />
              <Row label="Posl. reply" value={fmt(conversation.last_reply_at)} />
              <Row label="Vytvořeno" value={fmt(conversation.created_at)} />
              {conversation.abort_reason && (
                <Row label="Abort reason" value={conversation.abort_reason} />
              )}
            </dl>
          </section>
        )}

        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-3">Předchozí turny v konverzaci</h2>
          {turns.length === 0 && !lastReplyTurn ? (
            <p className="text-slate-400 text-sm">Žádné předchozí turny.</p>
          ) : (
            <ol className="space-y-3">
              {turns.map((t) => (
                <li key={t.n} className="rounded-lg bg-slate-900/60 border border-white/5 p-3">
                  <div className="text-xs text-slate-500 mb-1 flex flex-wrap gap-x-3">
                    <span className="text-cyan-300">Turn {t.n} · bot</span>
                    {t.intent && <span>intent: {t.intent}</span>}
                    {t.generated_at && <span>{fmt(t.generated_at)}</span>}
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap">
                    {t.body || <em className="text-slate-500">prázdný obsah</em>}
                  </div>
                </li>
              ))}
              {lastReplyTurn && (
                <li className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="text-xs text-amber-300 mb-1 flex flex-wrap gap-x-3">
                    <span>Poslední reply druhé strany</span>
                    {lastReplyTurn.at && <span>{fmt(lastReplyTurn.at)}</span>}
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap">
                    {lastReplyTurn.text}
                  </div>
                </li>
              )}
            </ol>
          )}
        </section>

        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-3">Reply, který bot nedovedl klasifikovat</h2>
          <div className="rounded-lg bg-slate-900/60 border border-white/5 p-3 text-sm text-slate-200 whitespace-pre-wrap">
            {flag.reply_text || <em className="text-slate-500">prázdný</em>}
          </div>
        </section>

        <section className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">AI návrh / lidská odpověď</h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            disabled={isResolved}
            className="w-full rounded-lg bg-slate-900/60 border border-white/10 focus:border-cyan-500/60 focus:outline-none px-3 py-2 text-sm text-white placeholder-slate-500 disabled:opacity-60"
            placeholder="Žádný návrh — napiš odpověď ručně."
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => runAction("ignore")}
              disabled={!!busy || isResolved}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium"
            >
              Ignore
            </button>
            <button
              onClick={() => runAction("abort")}
              disabled={!!busy || isResolved}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-50 text-red-300 text-sm font-medium"
            >
              Ukončit konverzaci
            </button>
            <button
              onClick={() => runAction("submit")}
              disabled={!!busy || isResolved || !draft.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-white text-sm font-semibold"
            >
              Odeslat reply
            </button>
          </div>
          {isResolved && flag.human_reply_text && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-200">
              <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Lidská odpověď</div>
              <div className="whitespace-pre-wrap">{flag.human_reply_text}</div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
      <dd className="text-slate-200">{value || "—"}</dd>
    </div>
  );
}
