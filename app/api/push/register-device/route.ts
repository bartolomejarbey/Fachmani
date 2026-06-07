import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/push/register-device
// body: { token, platform?, environment? }
// Uloží APNs/FCM device token přihlášeného uživatele (idempotentní UPSERT na token).
// Volá nativní aplikace po úspěšné registraci push notifikací.

type Body = {
  token?: string;
  platform?: "ios" | "android";
  environment?: "production" | "sandbox";
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.token || typeof body.token !== "string" || body.token.length < 16) {
    return NextResponse.json({ error: "Chybí platný token" }, { status: 400 });
  }

  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      {
        user_id: user.id,
        token: body.token,
        platform: body.platform === "android" ? "android" : "ios",
        environment: body.environment === "sandbox" ? "sandbox" : "production",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("profiles").update({ push_opt_in: true }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) return NextResponse.json({ error: "Chybí token" }, { status: 400 });

  const { error } = await supabase
    .from("device_tokens")
    .delete()
    .eq("token", body.token)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
