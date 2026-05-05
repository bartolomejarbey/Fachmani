import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/ghost/gdpr-opt-out
// Veřejný endpoint pro GDPR čl. 21 — subjekt vyžádá vyřazení svého IČO
// z ghost listingů. Žádný auth není potřeba (anonymní subjekt nemůže být
// claim-nutý). Rate limit po IP, max 10 requestů / hodinu.
//
// Body: { ico: string, email: string, reason?: string }

type OptOutBody = {
  ico?: unknown;
  email?: unknown;
  reason?: unknown;
};

const RATE_LIMIT_PER_HOUR = 10;
const ipBucket = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = ipBucket.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBucket.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true };
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Příliš mnoho požadavků. Zkuste to později." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: OptOutBody;
  try {
    body = (await req.json()) as OptOutBody;
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const ico = typeof body.ico === "string" ? body.ico.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500).trim() : null;

  if (!/^[0-9]{8}$/.test(ico)) {
    return NextResponse.json({ error: "Neplatné IČO (8 číslic)" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Neplatný email" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Najdi ghost a zkontroluj, že existuje a není claimed
  const { data: ghost, error: ghErr } = await sb
    .from("ghost_subjects")
    .select("ico, claimed_at, gdpr_suppressed")
    .eq("ico", ico)
    .maybeSingle();

  if (ghErr) {
    return NextResponse.json({ error: ghErr.message }, { status: 500 });
  }
  if (!ghost) {
    return NextResponse.json({ error: "IČO nenalezeno v ARES databázi" }, { status: 404 });
  }
  if ((ghost as { claimed_at: string | null }).claimed_at) {
    return NextResponse.json(
      { error: "Tento profil je již převzatý uživatelem — opt-out řešte přes nastavení účtu" },
      { status: 409 },
    );
  }
  if ((ghost as { gdpr_suppressed: boolean }).gdpr_suppressed) {
    return NextResponse.json({ ok: true, alreadySuppressed: true });
  }

  // Označ subjekt
  const { error: updErr } = await sb
    .from("ghost_subjects")
    .update({
      gdpr_suppressed: true,
      gdpr_suppressed_at: new Date().toISOString(),
      gdpr_suppressed_reason: reason ? `${reason} (kontakt: ${email})` : `Žádost z ${email}`,
    })
    .eq("ico", ico);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
