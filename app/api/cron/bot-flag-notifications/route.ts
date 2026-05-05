import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderBotFlagEmail, type BotFlagSummary } from "@/lib/email/bot-flag-notification";

export const runtime = "nodejs";
export const maxDuration = 30;

// /api/cron/bot-flag-notifications
// Vercel Cron volá každých 5 minut. Najde pending flagy s notified_at IS NULL,
// pošle souhrnný mail všem owner / admin profilům a označí flagy jako notifikované.
//
// Auth: Vercel Cron posílá `Authorization: Bearer ${CRON_SECRET}` automaticky.
//   Fallback: ?secret=, x-cron-secret pro lokální testy.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";
const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_BATCH = 50;

type FlagRow = BotFlagSummary;
type Recipient = { email: string };

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/bot-flag-notifications] RESEND_API_KEY missing — skipping send (STUB)");
    return { ok: false as const, reason: "missing_api_key" };
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[cron/bot-flag-notifications] Resend send failed", res.status, err.slice(0, 300));
    return { ok: false as const, reason: `http_${res.status}` };
  }
  return { ok: true as const };
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  return provided === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET není nastaven na serveru" }, { status: 500 });
  }
  if (!authorize(req)) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase env (URL nebo SERVICE_ROLE_KEY) chybí" },
      { status: 500 },
    );
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: flagRows, error: flagErr } = await sb
    .from("bot_flagged_replies")
    .select("id, reply_author_name, reply_text, flag_reason, ai_suggestion, created_at, fb_comment_url")
    .eq("status", "pending")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);
  if (flagErr) {
    return NextResponse.json({ error: `flag query: ${flagErr.message}` }, { status: 500 });
  }
  const flags: FlagRow[] = (flagRows as FlagRow[]) || [];
  if (flags.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, recipients: 0, flags: 0 });
  }

  const { data: recipients, error: recErr } = await sb
    .from("profiles")
    .select("email")
    .in("admin_role", ["master_admin", "admin"])
    .not("email", "is", null);
  if (recErr) {
    return NextResponse.json({ error: `recipient query: ${recErr.message}` }, { status: 500 });
  }
  const emails = Array.from(
    new Set(((recipients as Recipient[]) || []).map((r) => r.email).filter(Boolean) as string[]),
  );
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, recipients: 0, flags: flags.length, note: "no admins" });
  }

  const { subject, html, text } = renderBotFlagEmail({
    flags,
    adminUrl: `${SITE_URL}/admin/bot-flags`,
  });

  let sent = 0;
  let failed = 0;
  for (const to of emails) {
    const r = await sendEmail(to, subject, html, text);
    if (r.ok) sent++;
    else failed++;
  }

  if (sent > 0 || !process.env.RESEND_API_KEY) {
    // Označ flag-y jako notifikované, i když STUB (žádný API key) — jinak by každý cron tick
    // znovu loggoval stejný flag a admin by se zaplavil duplicitami až po nastavení Resend.
    const ids = flags.map((f) => f.id);
    const { error: updErr } = await sb
      .from("bot_flagged_replies")
      .update({ notified_at: new Date().toISOString() })
      .in("id", ids);
    if (updErr) {
      console.error("[cron/bot-flag-notifications] notified_at update failed", updErr.message);
    }
  }

  return NextResponse.json({
    ok: true,
    flags: flags.length,
    recipients: emails.length,
    sent,
    failed,
  });
}
