import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderNewsletterDigest, type DigestRequest } from "@/lib/email/newsletter-digest";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api/cron/newsletter-digest
// Schedule: vercel.json — Wed 08:00 + Sun 08:00 (`0 8 * * 3,0`).
// Co dělá:
//   1) najde všechny aktivní newsletter_subscribers
//   2) pro odběratele propojeného s profilem (user_id) sestaví top 5 čerstvých
//      poptávek za posledních 7 dní v jeho kategoriích a regionu
//   3) pro anonymní odběratele top 5 čerstvých poptávek napříč celou ČR
//   4) odešle přes Resend (pokud chybí RESEND_API_KEY → STUB log)
//   5) každého úspěšného loguje do newsletter_digest_log (per-day per-subscriber)
//      aby se neposílalo dvakrát za den

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";
const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_REQUESTS_PER_DIGEST = 5;
const REQUEST_LOOKBACK_DAYS = 7;

type Subscriber = {
  id: string;
  email: string;
  user_id: string | null;
  unsubscribe_token: string | null;
};

type ProfileBits = {
  id: string;
  full_name: string | null;
  region_id: string | null;
};

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  return provided === secret;
}

async function sendEmail(to: string, subject: string, html: string, text: string, unsubscribeUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false as const, reason: "missing_api_key" };
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[cron/newsletter-digest] Resend send failed", res.status, err.slice(0, 300));
    return { ok: false as const, reason: `http_${res.status}` };
  }
  return { ok: true as const };
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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekday = today.toLocaleDateString("cs-CZ", { weekday: "long" });
  const lookbackIso = new Date(today.getTime() - REQUEST_LOOKBACK_DAYS * 86400000).toISOString();

  const { data: subs, error: subsErr } = await sb
    .from("newsletter_subscribers")
    .select("id, email, user_id, unsubscribe_token")
    .eq("is_active", true)
    .limit(5000);
  if (subsErr) return NextResponse.json({ error: `subs query: ${subsErr.message}` }, { status: 500 });

  const subscribers = (subs as Subscriber[]) || [];
  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, total: 0, weekday });
  }

  const userIds = subscribers.map((s) => s.user_id).filter(Boolean) as string[];
  const profiles = new Map<string, ProfileBits>();
  if (userIds.length) {
    const { data: profData } = await sb
      .from("profiles")
      .select("id, full_name, region_id")
      .in("id", userIds);
    for (const p of (profData as ProfileBits[]) || []) profiles.set(p.id, p);
  }

  const providerCategoryMap = new Map<string, string[]>();
  if (userIds.length) {
    const { data: pcData } = await sb
      .from("provider_categories")
      .select("provider_id, category_id")
      .in("provider_id", userIds);
    for (const pc of (pcData as { provider_id: string; category_id: string }[]) || []) {
      const arr = providerCategoryMap.get(pc.provider_id) || [];
      arr.push(pc.category_id);
      providerCategoryMap.set(pc.provider_id, arr);
    }
  }

  const { data: alreadySent } = await sb
    .from("newsletter_digest_log")
    .select("subscriber_id")
    .eq("digest_date", todayStr);
  const sentToday = new Set(((alreadySent as { subscriber_id: string }[]) || []).map((r) => r.subscriber_id));

  const { data: globalRecentRaw } = await sb
    .from("requests")
    .select("id, title, description, location, budget_min, budget_max, is_urgent, category_id, region_id, created_at, status, moderation_status")
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .gte("created_at", lookbackIso)
    .order("created_at", { ascending: false })
    .limit(200);
  type RawRequest = {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    budget_min: number | null;
    budget_max: number | null;
    is_urgent: boolean | null;
    category_id: string | null;
    region_id: string | null;
    created_at: string;
  };
  const recentAll = (globalRecentRaw as RawRequest[]) || [];

  const categoryIds = Array.from(new Set(recentAll.map((r) => r.category_id).filter(Boolean) as string[]));
  const categoryMap = new Map<string, string>();
  if (categoryIds.length) {
    const { data: catData } = await sb
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const c of (catData as { id: string; name: string }[]) || []) categoryMap.set(c.id, c.name);
  }

  function pickRequestsForSubscriber(sub: Subscriber): DigestRequest[] {
    const profile = sub.user_id ? profiles.get(sub.user_id) : null;
    const myCategories = sub.user_id ? providerCategoryMap.get(sub.user_id) || [] : [];
    let candidates = recentAll;
    if (profile && myCategories.length > 0) {
      const catSet = new Set(myCategories);
      candidates = candidates.filter((r) => r.category_id && catSet.has(r.category_id));
    }
    if (profile?.region_id) {
      const sameRegion = candidates.filter((r) => r.region_id === profile.region_id);
      if (sameRegion.length > 0) candidates = sameRegion;
    }
    return candidates.slice(0, MAX_REQUESTS_PER_DIGEST).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      category_name: r.category_id ? categoryMap.get(r.category_id) || null : null,
      budget_min: r.budget_min,
      budget_max: r.budget_max,
      is_urgent: r.is_urgent,
    }));
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let stubMode = false;
  const failures: string[] = [];
  const newlyLogged: { subscriber_id: string; digest_date: string; recipient_count: number }[] = [];

  for (const sub of subscribers) {
    if (sentToday.has(sub.id)) {
      skipped++;
      continue;
    }
    const recipientName = sub.user_id ? profiles.get(sub.user_id)?.full_name : null;
    const requests = pickRequestsForSubscriber(sub);
    const unsubscribeUrl = sub.unsubscribe_token
      ? `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
      : `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;

    const { subject, html, text } = renderNewsletterDigest({
      recipientName,
      requests,
      weekdayLabel: weekday,
      siteUrl: SITE_URL,
      unsubscribeUrl,
    });

    const r = await sendEmail(sub.email, subject, html, text, unsubscribeUrl);
    if (r.ok) {
      sent++;
      newlyLogged.push({ subscriber_id: sub.id, digest_date: todayStr, recipient_count: requests.length });
    } else if (r.reason === "missing_api_key") {
      stubMode = true;
      skipped++;
    } else {
      failed++;
      failures.push(`${sub.email}: ${r.reason}`);
    }
  }

  if (newlyLogged.length > 0) {
    const { error: logErr } = await sb.from("newsletter_digest_log").insert(newlyLogged);
    if (logErr) console.error("[cron/newsletter-digest] log insert failed", logErr.message);
  }

  return NextResponse.json({
    ok: true,
    weekday,
    digest_date: todayStr,
    total: subscribers.length,
    sent,
    skipped,
    failed,
    stub: stubMode,
    failures: failures.slice(0, 5),
  });
}
