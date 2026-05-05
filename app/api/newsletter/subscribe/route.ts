import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// B.F5 — opt-in
// POST /api/newsletter/subscribe { email, source? }
// Idempotent — pokud už subscribed, vrátí ok bez chyby.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; source?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const source = body?.source?.trim().slice(0, 50) || "footer";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Neplatný email" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Upsert by email — pokud existuje a je inactive, znovu aktivuj
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email,
        user_id: user?.id ?? null,
        source,
        is_active: true,
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Děkujeme! Přihlášení k odběru proběhlo úspěšně." });
}
