import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifySms } from "@/lib/sms/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api/cron/urgent-sms
// Schedule: každých 5 minut. Najde 'new_candidate_request' notifikace pro
// PRIORITNÍ poptávky a odešle SMS premium fachmanům s sms_opt_in=true.
// Idempotence: notifications.sms_sent_at — po odeslání nebo po stub
// (chybějící API key) označíme abychom neopakovali.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const MAX_BATCH = 50;

type NotificationRow = {
  id: string;
  user_id: string;
  link: string | null;
  message: string | null;
};

type RequestRow = {
  id: string;
  title: string;
  is_urgent: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  sms_opt_in: boolean | null;
  sms_phone_verified: boolean | null;
  subscription_type: string | null;
};

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret");
  return provided === secret;
}

function extractRequestIdFromLink(link: string | null): string | null {
  if (!link) return null;
  const m = link.match(/\/poptavka\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : null;
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

  const { data: notifs, error: nErr } = await sb
    .from("notifications")
    .select("id, user_id, link, message")
    .eq("type", "new_candidate_request")
    .is("sms_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);
  if (nErr) return NextResponse.json({ error: `notifs query: ${nErr.message}` }, { status: 500 });

  const notifications = (notifs as NotificationRow[]) || [];
  if (notifications.length === 0) {
    return NextResponse.json({ ok: true, batch: 0, sent: 0, skipped: 0 });
  }

  const requestIds = Array.from(
    new Set(notifications.map((n) => extractRequestIdFromLink(n.link)).filter(Boolean) as string[]),
  );
  const requestsMap = new Map<string, RequestRow>();
  if (requestIds.length) {
    const { data: requestsData } = await sb
      .from("requests")
      .select("id, title, is_urgent")
      .in("id", requestIds);
    for (const r of (requestsData as RequestRow[]) || []) requestsMap.set(r.id, r);
  }

  const userIds = Array.from(new Set(notifications.map((n) => n.user_id)));
  const profiles = new Map<string, ProfileRow>();
  if (userIds.length) {
    const { data: profData } = await sb
      .from("profiles")
      .select("id, full_name, phone, sms_opt_in, sms_phone_verified, subscription_type")
      .in("id", userIds);
    for (const p of (profData as ProfileRow[]) || []) profiles.set(p.id, p);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let stubMode = false;
  const markIds: string[] = [];

  for (const notif of notifications) {
    const reqId = extractRequestIdFromLink(notif.link);
    const request = reqId ? requestsMap.get(reqId) : null;
    if (!request || !request.is_urgent) {
      skipped++;
      markIds.push(notif.id);
      continue;
    }
    const profile = profiles.get(notif.user_id);
    if (!profile?.phone || !profile.sms_opt_in || !profile.sms_phone_verified) {
      skipped++;
      markIds.push(notif.id);
      continue;
    }
    if (profile.subscription_type !== "premium") {
      skipped++;
      markIds.push(notif.id);
      continue;
    }

    const result = await notifySms({
      userId: profile.id,
      phone: profile.phone,
      body: `⚡ Fachmani: nová PRIORITNÍ poptávka "${request.title.slice(0, 80)}". ${SITE_URL}/poptavka/${request.id}`,
      type: "urgent_request_match",
      relatedEntityType: "request",
      relatedEntityId: request.id,
    });
    if (result.status === "sent") {
      sent++;
      markIds.push(notif.id);
    } else if (result.status === "stub") {
      stubMode = true;
      skipped++;
      markIds.push(notif.id);
    } else {
      failed++;
    }
  }

  if (markIds.length > 0) {
    await sb.from("notifications").update({ sms_sent_at: new Date().toISOString() }).in("id", markIds);
  }

  return NextResponse.json({
    ok: true,
    batch: notifications.length,
    sent,
    skipped,
    failed,
    stub: stubMode,
  });
}
