import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push/vapid";
import { sendApns, isApnsConfigured } from "@/lib/push/apns";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api/cron/push-fanout
// Schedule: každých 5 minut. Najde notifikace s push_sent_at IS NULL,
// pošle Web Push všem aktivním zařízením uživatele a označí.
// Mažeme expired (404/410) subscriptions automaticky.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const MAX_BATCH = 100;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  message: string | null;
  link: string | null;
};

type PushSubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type DeviceTokenRow = {
  id: string;
  user_id: string;
  token: string;
  environment: "production" | "sandbox";
};

type ProfileBits = {
  id: string;
  push_opt_in: boolean | null;
};

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
    return NextResponse.json({ error: "CRON_SECRET není nastaven" }, { status: 500 });
  }
  if (!authorize(req)) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }
  const webPushReady = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const apnsReady = isApnsConfigured();
  if (!webPushReady && !apnsReady) {
    return NextResponse.json({ ok: true, skipped: "no_push_configured", note: "STUB: nastav VAPID nebo APNS klíče" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase env chybí" }, { status: 500 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: notifs, error: nErr } = await sb
    .from("notifications")
    .select("id, user_id, type, title, message, link")
    .is("push_sent_at", null)
    .in("type", ["new_offer", "offer_accepted", "new_candidate_request"])
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);
  if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });

  const notifications = (notifs as NotificationRow[]) || [];
  if (notifications.length === 0) {
    return NextResponse.json({ ok: true, batch: 0, sent: 0, skipped: 0 });
  }

  const userIds = Array.from(new Set(notifications.map((n) => n.user_id)));

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, push_opt_in")
    .in("id", userIds);
  const optIn = new Map<string, boolean>();
  for (const p of (profiles as ProfileBits[]) || []) optIn.set(p.id, !!p.push_opt_in);

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  const subsByUser = new Map<string, PushSubRow[]>();
  for (const s of (subs as PushSubRow[]) || []) {
    const arr = subsByUser.get(s.user_id) || [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  // iOS APNs device tokeny (nativní aplikace)
  const tokensByUser = new Map<string, DeviceTokenRow[]>();
  if (apnsReady) {
    const { data: tokens } = await sb
      .from("device_tokens")
      .select("id, user_id, token, environment")
      .in("user_id", userIds);
    for (const t of (tokens as DeviceTokenRow[]) || []) {
      const arr = tokensByUser.get(t.user_id) || [];
      arr.push(t);
      tokensByUser.set(t.user_id, arr);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let expired = 0;
  let apnsSent = 0;
  const expiredIds: string[] = [];
  const expiredTokenIds: string[] = [];
  const markIds: string[] = [];

  for (const notif of notifications) {
    if (!optIn.get(notif.user_id)) {
      skipped++;
      markIds.push(notif.id);
      continue;
    }
    const userSubs = subsByUser.get(notif.user_id) || [];
    const userTokens = tokensByUser.get(notif.user_id) || [];
    if (userSubs.length === 0 && userTokens.length === 0) {
      skipped++;
      markIds.push(notif.id);
      continue;
    }
    let anySent = false;
    // Web push
    for (const s of userSubs) {
      const result = await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        {
          title: notif.title || "Fachmani",
          body: notif.message || "",
          url: notif.link ? `${SITE_URL}${notif.link}` : SITE_URL,
          tag: `notif-${notif.id}`,
        },
      );
      if (result.ok) {
        anySent = true;
      } else if (result.expired) {
        expiredIds.push(s.id);
        expired++;
      } else {
        failed++;
      }
    }
    // iOS APNs
    for (const t of userTokens) {
      const result = await sendApns(
        t.token,
        {
          title: notif.title || "Fachmani",
          body: notif.message || "",
          url: notif.link ? `${SITE_URL}${notif.link}` : SITE_URL,
        },
        t.environment,
      );
      if (result.ok) {
        anySent = true;
        apnsSent++;
      } else if (result.expired) {
        expiredTokenIds.push(t.id);
        expired++;
      } else {
        failed++;
      }
    }
    if (anySent) {
      sent++;
      markIds.push(notif.id);
    } else {
      // vše failed → ponecháme push_sent_at NULL pro retry, ale pokud to byly jen
      // expired endpointy/tokeny, taky mark (jinak by se to vezlo donekonečna)
      const allExpired =
        userSubs.every((s) => expiredIds.includes(s.id)) &&
        userTokens.every((t) => expiredTokenIds.includes(t.id));
      if (allExpired) markIds.push(notif.id);
    }
  }

  if (expiredIds.length > 0) {
    await sb.from("push_subscriptions").delete().in("id", expiredIds);
  }
  if (expiredTokenIds.length > 0) {
    await sb.from("device_tokens").delete().in("id", expiredTokenIds);
  }
  if (markIds.length > 0) {
    await sb.from("notifications").update({ push_sent_at: new Date().toISOString() }).in("id", markIds);
  }

  return NextResponse.json({
    ok: true,
    batch: notifications.length,
    sent,
    apnsSent,
    skipped,
    failed,
    expired,
  });
}
