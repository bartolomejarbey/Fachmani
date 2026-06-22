import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// B.F5 — opt-in
// POST /api/newsletter/subscribe { email, source? }
// Idempotent. Zápis přes service-role (přímý anon INSERT do newsletter_subscribers zrušen
// kvůli spamu/přihlašování cizích e-mailů) + per-IP rate-limit.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// in-memory per-IP rate-limit (best-effort, per instance)
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 8;
const rl = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (rl.get(key) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rl.set(key, hits);
  return hits.length > RL_MAX;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; source?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const source = body?.source?.trim().slice(0, 50) || "footer";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Neplatný email" }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 24) : "x";
  if (rateLimited(`ip:${ipHash}`)) {
    return NextResponse.json({ error: "Příliš mnoho pokusů. Zkuste to za chvíli." }, { status: 429 });
  }

  // user_id (nepovinné) z případné session
  const ssr = await createSupabaseServer();
  const { data: { user } } = await ssr.auth.getUser();

  // zápis přes service-role (RLS: přímý anon INSERT zrušen)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { error } = await admin
    .from("newsletter_subscribers")
    .upsert(
      { email, user_id: user?.id ?? null, source, is_active: true, unsubscribed_at: null },
      { onConflict: "email" },
    );

  if (error) {
    console.error("[newsletter/subscribe]", error.message);
    return NextResponse.json({ error: "Přihlášení se nezdařilo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Děkujeme! Přihlášení k odběru proběhlo úspěšně." });
}
