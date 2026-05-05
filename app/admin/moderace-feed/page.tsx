"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type ModerationPost = {
  id: string;
  user_id: string | null;
  content: string | null;
  image_url: string | null;
  moderation_status: string;
  moderation_flags: Record<string, boolean> | null;
  moderation_checked_at: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
};

type ReportedPost = {
  post_id: string;
  content: string | null;
  image_url: string | null;
  post_created_at: string;
  post_user_id: string | null;
  post_user_name: string | null;
  post_user_email: string | null;
  report_count: number;
  pending_reports: number;
  reasons: string[];
  last_report_at: string;
};

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Nevhodný",
  fraud: "Podvod",
  fake: "Fake",
  other: "Jiné",
};

export default function AdminFeedModerace() {
  const [items, setItems] = useState<ModerationPost[]>([]);
  const [reports, setReports] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [aiRes, reportsRes] = await Promise.all([
      supabase.from("v_post_moderation_queue").select("*").limit(200),
      supabase.from("v_post_reports_queue").select("*").limit(200),
    ]);
    setItems((aiRes.data as ModerationPost[]) || []);
    setReports((reportsRes.data as ReportedPost[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const dismissReports = async (postId: string) => {
    if (!confirm("Označit všechny pending reporty tohoto postu jako 'dismissed'?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("post_reports")
      .update({
        status: "dismissed",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("post_id", postId)
      .eq("status", "pending");
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "dismiss_post_reports",
      target_type: "post",
      target_id: postId,
    });
    load();
  };

  const actionReports = async (postId: string) => {
    if (!confirm("Smazat příspěvek a označit reporty jako 'actioned'?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("post_reports")
      .update({
        status: "actioned",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("post_id", postId)
      .eq("status", "pending");
    await supabase.from("posts").delete().eq("id", postId);
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "action_post_report_delete",
      target_type: "post",
      target_id: postId,
    });
    load();
  };

  const decide = async (postId: string, decision: "approved" | "flagged") => {
    const verb = decision === "approved" ? "schválit" : "skrýt";
    if (!confirm(`Opravdu ${verb} tento příspěvek?`)) return;
    await supabase
      .from("posts")
      .update({
        moderation_status: decision,
        moderation_checked_at: new Date().toISOString(),
      })
      .eq("id", postId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "moderate_post",
      target_type: "post",
      target_id: postId,
      details: { decision },
    });
    load();
  };

  const remove = async (postId: string) => {
    if (!confirm("Smazat příspěvek nenávratně?")) return;
    await supabase.from("posts").delete().eq("id", postId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "delete_post",
      target_type: "post",
      target_id: postId,
    });
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-white">🛡️ Moderace feedu</h1>
          <p className="text-slate-400 text-sm mt-1">
            Příspěvky čekající na rozhodnutí (AI moderace) + uživatelské reporty.
          </p>
        </header>

        {/* User reports section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            🚩 Uživatelské reporty
            {reports.length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </h2>
          {loading ? (
            <div className="text-slate-400">Načítám…</div>
          ) : reports.length === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-sm">
              Žádné nahlášené posty.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.post_id} className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">
                        {r.post_user_name ?? "—"} · {r.post_user_email ?? "—"} ·{" "}
                        {new Date(r.post_created_at).toLocaleString("cs-CZ")}
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-md">
                          {r.pending_reports} pending {r.pending_reports === 1 ? "report" : "reportů"}
                        </span>
                        {r.reasons.map((reason) => (
                          <span key={reason} className="bg-slate-700/50 text-slate-300 text-xs px-2 py-0.5 rounded-md">
                            {REASON_LABEL[reason] ?? reason}
                          </span>
                        ))}
                      </div>
                      <p className="text-slate-100 whitespace-pre-wrap mb-2">
                        {r.content || <em className="text-slate-500">(bez textu)</em>}
                      </p>
                      {r.image_url && (
                        <a
                          href={r.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 text-sm underline"
                        >
                          zobrazit obrázek →
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => dismissReports(r.post_id)}
                        className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-500/30"
                      >
                        ✅ Zamítnout report
                      </button>
                      <button
                        onClick={() => actionReports(r.post_id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30"
                      >
                        🗑️ Smazat post
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <header>
          <h2 className="text-lg font-semibold text-white">🤖 AI moderace</h2>
        </header>

        {loading ? (
          <div className="text-slate-400">Načítám…</div>
        ) : items.length === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl">
            ✅ Fronta je prázdná.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      {p.user_name ?? "—"} · {p.user_email ?? "—"} · {new Date(p.created_at).toLocaleString("cs-CZ")}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold mb-2 ${
                      p.moderation_status === "flagged" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {p.moderation_status === "flagged" ? "🚩 Flagged" : "⏳ Pending"}
                    </span>
                    <p className="text-slate-100 whitespace-pre-wrap mb-2">{p.content || <em className="text-slate-500">(bez textu)</em>}</p>
                    {p.image_url && (
                      <a href={p.image_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm underline">
                        zobrazit obrázek →
                      </a>
                    )}
                    {p.moderation_flags && (
                      <pre className="text-xs text-slate-500 mt-3 p-2 bg-black/30 rounded overflow-x-auto">
                        {JSON.stringify(p.moderation_flags, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => decide(p.id, "approved")}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-500/30"
                    >
                      ✅ Schválit
                    </button>
                    <button
                      onClick={() => decide(p.id, "flagged")}
                      className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-lg text-sm font-medium hover:bg-orange-500/30"
                    >
                      🚫 Flag
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30"
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
    </AdminLayout>
  );
}
