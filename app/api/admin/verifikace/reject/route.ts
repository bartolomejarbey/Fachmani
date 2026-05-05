import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const RESEND_API_URL = "https://api.resend.com/emails";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.org").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.org>";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("admin_role")
    .eq("id", user.id)
    .single();
  if (!me?.admin_role) return NextResponse.json({ error: "Pouze admin" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { user_id?: string; reason?: string }
    | null;
  const userId = body?.user_id?.trim();
  const reason = body?.reason?.trim();
  if (!userId) return NextResponse.json({ error: "Chybí user_id" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Chybí důvod zamítnutí" }, { status: 400 });
  if (reason.length < 10) {
    return NextResponse.json({ error: "Důvod musí mít alespoň 10 znaků" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, email, is_verified")
    .eq("id", userId)
    .single();

  if (!target) return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });

  // Ujistíme se, že uživatel není označen jako ověřený (ochrana proti race condition).
  if (target.is_verified) {
    await admin.from("profiles").update({ is_verified: false }).eq("id", userId);
  }

  // Záznam do activity logu — používá se k vyhledání rejection historie pro daného uživatele.
  await admin.from("admin_activity_log").insert({
    admin_id: user.id,
    action: "reject_verification",
    target_type: "user",
    target_id: userId,
    details: {
      reason,
      target_email: target.email,
      target_name: target.full_name,
    },
  });

  let emailSent = false;
  let emailError: string | null = null;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && target.email) {
    const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#dc2626;margin:0 0 16px">Ověření profilu zamítnuto</h2>
  <p>Dobrý den ${target.full_name || ""},</p>
  <p>vaše žádost o ověření profilu na Fachmani byla zamítnuta.</p>
  <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px">
    <strong>Důvod:</strong><br>
    ${reason.replace(/\n/g, "<br>")}
  </div>
  <p>Pokud máte za to, že došlo k chybě, nebo jste mezitím doplnili chybějící údaje, můžete podat novou žádost prostřednictvím vašeho profilu:</p>
  <p><a href="${SITE_URL}/dashboard/profil" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Otevřít profil</a></p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
  <p style="font-size:12px;color:#6b7280">Tento email byl odeslán automaticky. Pokud máte dotaz, odpovězte na něj nebo nás kontaktujte přes <a href="${SITE_URL}/kontakt">kontaktní formulář</a>.</p>
</div>`;

    const text = `Dobrý den ${target.full_name || ""},

vaše žádost o ověření profilu na Fachmani byla zamítnuta.

Důvod:
${reason}

Otevřete profil pro novou žádost: ${SITE_URL}/dashboard/profil

— Tým Fachmani`;

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [target.email],
          subject: "Ověření profilu na Fachmani — zamítnuto",
          html,
          text,
        }),
      });

      if (!res.ok) {
        emailError = `Resend ${res.status}: ${(await res.text()).slice(0, 200)}`;
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else if (!apiKey) {
    emailError = "RESEND_API_KEY není nastaven — důvod uložen do logu, email neposlán.";
  } else {
    emailError = "Uživatel nemá email — důvod uložen do logu.";
  }

  // Zaznamenám info o emailu do logu pro audit.
  if (emailSent || emailError) {
    await admin.from("admin_activity_log").insert({
      admin_id: user.id,
      action: emailSent ? "reject_verification_email_sent" : "reject_verification_email_failed",
      target_type: "user",
      target_id: userId,
      details: emailSent ? { to: target.email } : { error: emailError },
    });
  }

  return NextResponse.json({
    ok: true,
    email_sent: emailSent,
    email_error: emailError,
  });
}
