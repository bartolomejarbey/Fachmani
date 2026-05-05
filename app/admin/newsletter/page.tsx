"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Campaign = {
  id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: "draft" | "sending" | "sent" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
};

type Subscriber = {
  id: string;
  email: string;
  source: string | null;
  is_active: boolean;
  subscribed_at: string;
};

export default function AdminNewsletterPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [tab, setTab] = useState<"compose" | "campaigns" | "subscribers">("compose");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Compose form
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [campRes, subRes, activeRes] = await Promise.all([
      supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("newsletter_subscribers").select("id, email, source, is_active, subscribed_at").order("subscribed_at", { ascending: false }).limit(200),
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    setCampaigns((campRes.data ?? []) as Campaign[]);
    setSubscribers((subRes.data ?? []) as Subscriber[]);
    setActiveCount(activeRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    setMessage(null);
    if (!subject.trim() || !bodyHtml.trim()) {
      setMessage("Subject + body jsou povinné.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("newsletter_campaigns").insert({
      subject: subject.trim(),
      body_html: bodyHtml,
      body_text: bodyText || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage("✅ Draft uložen.");
      setSubject("");
      setBodyHtml("");
      setBodyText("");
      await load();
      setTab("campaigns");
    }
    setSaving(false);
  };

  const handleSend = async (id: string) => {
    if (!confirm("Opravdu odeslat kampaň všem aktivním odběratelům?")) return;
    setSending(id);
    setMessage(null);
    const res = await fetch("/api/admin/newsletter/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(`❌ ${data.error}`);
    } else if (data.stub) {
      setMessage(`⚠️ STUB mode (RESEND_API_KEY chybí): kampaň označena jako odeslaná pro ${data.recipient_count} odběratelů, ale skutečné emaily nebyly poslány.`);
    } else {
      const failed = data.failed_count || 0;
      const sent = data.sent_count || 0;
      const recipientCount = data.recipient_count || 0;
      if (failed === 0) {
        setMessage(`✅ Odesláno ${sent} z ${recipientCount} odběratelům přes Resend.`);
      } else {
        setMessage(`⚠️ Odesláno ${sent}, selhalo ${failed} z ${recipientCount}. ${data.failures?.slice(0, 1).join(" · ") || ""}`);
      }
    }
    setSending(null);
    await load();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📧 Newsletter</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aktivních odběratelů: <strong className="text-white">{activeCount}</strong>
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-200">
            {message}
          </div>
        )}

        <div className="flex gap-2 border-b border-white/10">
          {(["compose", "campaigns", "subscribers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t ? "text-white border-b-2 border-cyan-500" : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "compose" ? "✏️ Nová kampaň" : t === "campaigns" ? `📂 Historie (${campaigns.length})` : `👥 Odběratelé (${subscribers.length})`}
            </button>
          ))}
        </div>

        {tab === "compose" && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">Předmět</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="např. Nové fachmany u vás v okolí"
                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">Tělo (HTML)</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                placeholder='<h1>Nadpis</h1><p>Text...</p>'
                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white font-mono text-sm placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">Plain text fallback (volitelné)</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                placeholder="Pro klienty bez HTML podpory."
                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? "Ukládám..." : "💾 Uložit jako draft"}
            </button>
          </div>
        )}

        {tab === "campaigns" && (
          <div className="space-y-2">
            {loading ? (
              <div className="text-slate-400">Načítám...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-slate-400">Žádné kampaně.</div>
            ) : campaigns.map((c) => (
              <div key={c.id} className="p-4 bg-slate-900/40 border border-white/10 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{c.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        c.status === "sent" ? "bg-emerald-500/20 text-emerald-300" :
                        c.status === "draft" ? "bg-slate-500/20 text-slate-300" :
                        c.status === "sending" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Vytvořeno: {new Date(c.created_at).toLocaleString("cs-CZ")}
                      {c.sent_at && <> · Odesláno: {new Date(c.sent_at).toLocaleString("cs-CZ")}</>}
                      {c.status === "sent" && <> · Recipientů: {c.recipient_count}</>}
                    </div>
                  </div>
                  {c.status === "draft" && (
                    <button
                      onClick={() => handleSend(c.id)}
                      disabled={sending === c.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {sending === c.id ? "..." : "📤 Odeslat (STUB)"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "subscribers" && (
          <div className="bg-slate-900/40 border border-white/10 rounded-xl divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-slate-400">Načítám...</div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 text-slate-400">Žádní odběratelé.</div>
            ) : subscribers.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-white font-mono">{s.email}</div>
                  <div className="text-xs text-slate-500">
                    {s.source ?? "—"} · {new Date(s.subscribed_at).toLocaleDateString("cs-CZ")}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>
                  {s.is_active ? "aktivní" : "odhlášeno"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
