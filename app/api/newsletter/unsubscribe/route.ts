import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// B.F5 — unsubscribe link (z patičky emailu)
// GET /api/newsletter/unsubscribe?token=...
// Service role aby fungoval i pro nepřihlášené (link z emailu).

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Chybí token" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error, count } = await admin
    .from("newsletter_subscribers")
    .update({ is_active: false, unsubscribed_at: new Date().toISOString() }, { count: "exact" })
    .eq("unsubscribe_token", token)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ ok: true, message: "Odhlášení již proběhlo dříve nebo neplatný token." });
  }

  return NextResponse.json({ ok: true, message: "Úspěšně jste se odhlásili z newsletteru." });
}
