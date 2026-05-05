import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderAutoMatchEmail } from "@/lib/email/auto-match";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api/cron/auto-match-emails
// Vercel Cron volá pravidelně. Najde nezmailované 'new_candidate_request' notifikace,
// pošle Resend mail fachmanovi a označí email_sent_at, aby žádný mail nešel dvakrát.
//
// Auth: Vercel Cron posílá `Authorization: Bearer ${CRON_SECRET}` automaticky.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";
const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_BATCH = 100;

type NotificationRow = {
  id: string;
  user_id: string;
  link: string | null;
  message: string | null;
};

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type CategoryRow = { id: string; name: string };

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  return provided === secret;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/auto-match-emails] RESEND_API_KEY missing — skipping send (STUB)");
    return { ok: false as const, reason: "missing_api_key" };
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[cron/auto-match-emails] Resend send failed", res.status, err.slice(0, 300));
    return { ok: false as const, reason: `http_${res.status}` };
  }
  return { ok: true as const };
}

function extractRequestIdFromLink(link: string | null): string | null {
  if (!link) return null;
  const m = link.match(/\/poptavka\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : null;
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
    return NextResponse.json({ error: "Supabase env chybí" }, { status: 500 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: notifs, error: nErr } = await sb
    .from("notifications")
    .select("id, user_id, link, message")
    .eq("type", "new_candidate_request")
    .is("email_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);
  if (nErr) {
    return NextResponse.json({ error: `notifications query: ${nErr.message}` }, { status: 500 });
  }
  const notifications: NotificationRow[] = (notifs as NotificationRow[]) || [];
  if (notifications.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, batch: 0 });
  }

  const userIds = Array.from(new Set(notifications.map((n) => n.user_id)));
  const { data: profilesData } = await sb
    .from("profiles")
    .select("id, full_name, email, notify_on_requests")
    .in("id", userIds);
  type ProfileWithOpt = ProfileRow & { notify_on_requests: boolean | null };
  const profiles = new Map<string, ProfileWithOpt>();
  for (const p of (profilesData as ProfileWithOpt[]) || []) profiles.set(p.id, p);

  const requestIds = Array.from(
    new Set(notifications.map((n) => extractRequestIdFromLink(n.link)).filter(Boolean) as string[]),
  );
  const requestsMap = new Map<string, RequestRow>();
  if (requestIds.length) {
    const { data: requestsData } = await sb
      .from("requests")
      .select("id, title, description, location, category_id")
      .in("id", requestIds);
    for (const r of (requestsData as RequestRow[]) || []) requestsMap.set(r.id, r);
  }

  const categoryIds = Array.from(
    new Set(Array.from(requestsMap.values()).map((r) => r.category_id).filter(Boolean) as string[]),
  );
  const categoriesMap = new Map<string, string>();
  if (categoryIds.length) {
    const { data: catData } = await sb
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const c of (catData as CategoryRow[]) || []) categoriesMap.set(c.id, c.name);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const sentIds: string[] = [];

  for (const notif of notifications) {
    const profile = profiles.get(notif.user_id);
    if (!profile?.email) {
      skipped++;
      sentIds.push(notif.id);
      continue;
    }
    if (profile.notify_on_requests === false) {
      skipped++;
      sentIds.push(notif.id);
      continue;
    }
    const reqId = extractRequestIdFromLink(notif.link);
    if (!reqId) {
      skipped++;
      sentIds.push(notif.id);
      continue;
    }
    const request = requestsMap.get(reqId);
    if (!request) {
      // request asi smazaný — neposíláme, ale označíme jako "vyřešeno" abychom neopakovali
      skipped++;
      sentIds.push(notif.id);
      continue;
    }

    const { subject, html, text } = renderAutoMatchEmail({
      recipientName: profile.full_name,
      requestTitle: request.title,
      requestDescription: request.description,
      categoryName: request.category_id ? categoriesMap.get(request.category_id) || null : null,
      location: request.location,
      requestUrl: `${SITE_URL}/poptavka/${request.id}`,
      unsubscribeUrl: `${SITE_URL}/dashboard/profil#notifikace`,
    });

    const r = await sendEmail(profile.email, subject, html, text);
    if (r.ok) {
      sent++;
      sentIds.push(notif.id);
    } else if (r.reason === "missing_api_key") {
      // STUB: označ jako odeslané, jinak by se cron snažil donekonečna a admin se v logu ztratí
      skipped++;
      sentIds.push(notif.id);
    } else {
      failed++;
      // Nepřidáme do sentIds → příští cron tick zkusí znovu
    }
  }

  if (sentIds.length) {
    const { error: updErr } = await sb
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .in("id", sentIds);
    if (updErr) {
      console.error("[cron/auto-match-emails] email_sent_at update failed", updErr.message);
    }
  }

  return NextResponse.json({
    ok: true,
    batch: notifications.length,
    sent,
    skipped,
    failed,
  });
}
