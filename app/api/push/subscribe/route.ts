import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/push/subscribe
// body: { endpoint, keys: { p256dh, auth } }
// Vyžaduje přihlášeného uživatele. Idempotentní (UPSERT na endpoint).

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Chybí endpoint nebo keys" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: body.user_agent || req.headers.get("user-agent") || null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("profiles").update({ push_opt_in: true }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Chybí endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pokud uživatel už nemá žádnou subscription, opt-out
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count === 0) {
    await supabase.from("profiles").update({ push_opt_in: false }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
