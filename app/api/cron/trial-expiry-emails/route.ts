import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderTrialEmail, TrialEmailPhase } from "@/lib/email/trial-expiry";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api/cron/trial-expiry-emails
// Volá Vercel Cron 1× denně. Pošle 3 typy emailů:
//   - "warning"  — trial končí za 7 dní (T-7d, jednou)
//   - "grace"    — trial právě vypršel, začíná 7-denní grace (jednou)
//   - "blocked"  — grace skončila (jednou)
// Označí trial_warning_sent_at / trial_grace_email_sent_at / trial_blocked_email_sent_at,
// aby žádný mail nešel dvakrát.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";
const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_BATCH = 200;

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  trial_until: string | null;
  subscription_type: string | null;
  trial_warning_sent_at: string | null;
  trial_grace_email_sent_at: string | null;
  trial_blocked_email_sent_at: string | null;
  notify_on_requests: boolean | null;
};

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret");
  return provided === secret;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/trial-expiry-emails] RESEND_API_KEY missing — STUB mode");
    return { ok: false as const, reason: "missing_api_key" };
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[cron/trial-expiry-emails] Resend send failed", res.status, err.slice(0, 300));
    return { ok: false as const, reason: `http_${res.status}` };
  }
  return { ok: true as const };
}

function classify(p: ProfileRow, graceDays: number): { phase: TrialEmailPhase; column: string } | null {
  if (!p.trial_until) return null;
  if (p.subscription_type === "premium" || p.subscription_type === "business") return null;

  const trialEnd = new Date(p.trial_until).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const graceEnd = trialEnd + graceDays * dayMs;

  // Phase: warning (-7d to -0d before trial end)
  if (trialEnd > now && trialEnd - now <= 7 * dayMs && !p.trial_warning_sent_at) {
    return { phase: "warning", column: "trial_warning_sent_at" };
  }
  // Phase: grace (trial expired, grace running)
  if (trialEnd <= now && now < graceEnd && !p.trial_grace_email_sent_at) {
    return { phase: "grace", column: "trial_grace_email_sent_at" };
  }
  // Phase: blocked (grace expired)
  if (now >= graceEnd && !p.trial_blocked_email_sent_at) {
    return { phase: "blocked", column: "trial_blocked_email_sent_at" };
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET není nastaven" }, { status: 500 });
  }
  if (!authorize(req)) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase env chybí" }, { status: 500 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: settings } = await sb
    .from("system_settings")
    .select("value")
    .eq("key", "platform_settings")
    .maybeSingle();
  const graceDays = (settings?.value as Record<string, unknown>)?.["trial_grace_days"] as number | undefined;
  const graceDaysFinal = typeof graceDays === "number" && graceDays > 0 ? graceDays : 7;

  // Fetch free fachmani s trial_until v relevantním okně:
  //   warning:  trial_until in [now, now + 7d]
  //   grace:    trial_until in [now - graceDays, now]
  //   blocked:  trial_until < now - graceDays
  const lookbackIso = new Date(Date.now() - (graceDaysFinal + 30) * 24 * 60 * 60 * 1000).toISOString();
  const lookaheadIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profilesData, error: pErr } = await sb
    .from("profiles")
    .select(
      "id, full_name, email, trial_until, subscription_type, trial_warning_sent_at, trial_grace_email_sent_at, trial_blocked_email_sent_at, notify_on_requests, role",
    )
    .in("role", ["provider", "fachman"])
    .or("subscription_type.is.null,subscription_type.eq.free")
    .gte("trial_until", lookbackIso)
    .lte("trial_until", lookaheadIso)
    .limit(MAX_BATCH);

  if (pErr) {
    return NextResponse.json({ error: `profiles query: ${pErr.message}` }, { status: 500 });
  }
  const profiles: ProfileRow[] = (profilesData as ProfileRow[]) || [];

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const updates: { id: string; column: string }[] = [];

  for (const p of profiles) {
    if (!p.email) {
      skipped++;
      continue;
    }
    if (p.notify_on_requests === false) {
      skipped++;
      continue;
    }
    const decision = classify(p, graceDaysFinal);
    if (!decision) {
      skipped++;
      continue;
    }

    const trialEnd = p.trial_until ? new Date(p.trial_until) : null;
    const graceEnd = trialEnd ? new Date(trialEnd.getTime() + graceDaysFinal * 24 * 60 * 60 * 1000) : null;

    const { subject, html, text } = renderTrialEmail({
      recipientName: p.full_name,
      phase: decision.phase,
      trialEndsAt: trialEnd,
      graceEndsAt: graceEnd,
      upgradeUrl: `${SITE_URL}/predplatne`,
      unsubscribeUrl: `${SITE_URL}/dashboard/profil#notifikace`,
    });

    const r = await sendEmail(p.email, subject, html, text);
    if (r.ok) {
      sent++;
      updates.push({ id: p.id, column: decision.column });
    } else if (r.reason === "missing_api_key") {
      // STUB: označ jako odeslané, jinak by se cron snažil donekonečna
      skipped++;
      updates.push({ id: p.id, column: decision.column });
    } else {
      failed++;
    }
  }

  // Apply updates per column
  const nowIso = new Date().toISOString();
  const byColumn = new Map<string, string[]>();
  for (const u of updates) {
    const arr = byColumn.get(u.column) || [];
    arr.push(u.id);
    byColumn.set(u.column, arr);
  }
  for (const [column, ids] of byColumn.entries()) {
    const { error: updErr } = await sb
      .from("profiles")
      .update({ [column]: nowIso })
      .in("id", ids);
    if (updErr) {
      console.error("[cron/trial-expiry-emails] update failed", column, updErr.message);
    }
  }

  return NextResponse.json({
    ok: true,
    batch: profiles.length,
    sent,
    skipped,
    failed,
  });
}
