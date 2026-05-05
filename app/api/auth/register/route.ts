import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractIp } from "@/lib/ares/rate-limit";
import { renderAccountExistsEmail } from "@/lib/email/account-exists";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// Server-side registrace s anti-enumeration ochranou.
// - Pokud email už existuje v auth.users → pošle "account exists" email přes Resend
//   a vrátí stejnou success response jako úspěšná registrace.
// - Pokud neexistuje → volá supabase.auth.signUp() a Supabase pošle confirmation email.
// Cíl: útočník z venku nepozná, jestli je email zaregistrovaný.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";
const RESEND_API_URL = "https://api.resend.com/emails";

// In-memory rate limit (per Vercel instance). 5 attempts / 60s / IP.
// Edge case: serverless škáluje → každá instance má vlastní mapu. Pro skutečný DDOS
// nedostatečné, ale dostatečně tlumí běžné enumeration scripty.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function checkRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const arr = (attempts.get(ip) || []).filter((t) => t > cutoff);
  if (arr.length >= RATE_LIMIT_MAX) {
    attempts.set(ip, arr);
    const oldest = arr[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  arr.push(now);
  attempts.set(ip, arr);
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterBody = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
};

function emailHashShort(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 12);
}

// Lookup auth.users via GoTrue Admin API. Vrátí null pokud nenalezeno, jinak user objekt.
async function findAuthUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<{ id: string; email: string; user_metadata?: { full_name?: string } } | null> {
  const url = `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });
  if (!res.ok) {
    console.error("[register] auth admin lookup failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { users?: Array<{ id: string; email: string; user_metadata?: { full_name?: string } }> };
  if (!Array.isArray(json.users) || json.users.length === 0) return null;
  // GoTrue ?email=xxx vrací case-insensitive match jako pole
  const match = json.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  return match || null;
}

async function sendAccountExistsEmail(to: string, name: string | null): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[register] RESEND_API_KEY missing — skipping account-exists email (STUB)");
    return;
  }
  const loginUrl = `${SITE_URL}/auth/login`;
  const resetUrl = `${SITE_URL}/auth/forgot-password`;
  const { subject, html, text } = renderAccountExistsEmail({ name, loginUrl, resetUrl });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[register] Resend account-exists send failed", res.status, err.slice(0, 300));
  }
}

export async function POST(req: NextRequest) {
  const ip = extractIp(req.headers);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Příliš mnoho pokusů. Zkuste to za chvíli znovu." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  let body: RegisterBody = {};
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const fullName = (body.fullName || "").trim();
  const role = body.role === "provider" ? "provider" : "customer";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Neplatná emailová adresa." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ error: "Jméno musí mít 2–120 znaků." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("[register] missing env: SUPABASE_URL/SERVICE_ROLE/ANON");
    return NextResponse.json({ error: "Server není správně nakonfigurován." }, { status: 500 });
  }

  const hash = emailHashShort(email);

  // 1) Detekuj existující účet (auth.users via GoTrue Admin API)
  const existing = await findAuthUserByEmail(supabaseUrl, serviceRoleKey, email);

  if (existing) {
    // Duplicate: pošli account-exists email + audit log + frontendu sděl exists=true.
    // (UX-first per user request — anti-enumeration jsme vědomě obětovali.)
    console.log(`[register] flow=duplicate hash=${hash}`);
    const knownName = existing.user_metadata?.full_name || null;
    try {
      await sendAccountExistsEmail(email, knownName);
    } catch (e) {
      console.error("[register] account-exists send threw:", e);
    }

    try {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.from("admin_activity_log").insert({
        admin_id: null,
        action: "register_attempt_existing_email",
        target_type: "user",
        target_id: existing.id,
        details: { email_hash: hash, ip, role_attempted: role },
      });
    } catch (e) {
      console.error("[register] activity log failed:", e);
    }

    return NextResponse.json({ ok: true, exists: true });
  }

  // 2) Nový email → server-side signUp s anon klientem (Supabase pošle confirmation email).
  console.log(`[register] flow=new hash=${hash}`);
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signUpError } = await anon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (signUpError) {
    const msg = signUpError.message || "";
    // Pojistka: pokud signUp z nějakého důvodu signalizuje duplicitu, fallback do duplicate path.
    if (/already|registered|exists/i.test(msg)) {
      console.log(`[register] fallback=duplicate hash=${hash} reason=${msg}`);
      try {
        await sendAccountExistsEmail(email, fullName || null);
      } catch (e) {
        console.error("[register] fallback account-exists send threw:", e);
      }
      return NextResponse.json({ ok: true, exists: true });
    }
    if (/Password should be at least 6 characters/i.test(msg)) {
      return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
    }
    if (/Unable to validate email address/i.test(msg)) {
      return NextResponse.json({ error: "Neplatná emailová adresa." }, { status: 400 });
    }
    console.error("[register] signUp failed:", msg);
    return NextResponse.json(
      { error: "Registrace se nezdařila. Zkontrolujte údaje nebo zkuste jiný email." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
