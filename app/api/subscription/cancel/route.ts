import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST = naplánovat zrušení ke konci období
// DELETE = obnovit (zrušit naplánované zrušení)
//
// Nepřerušujeme přístup okamžitě — uživatel doplatil období a má na něj nárok.
// Cron `auto_downgrade_cancelled_subscriptions()` profil převede na free
// jakmile subscription_expires_at vyprší.
//
// TODO: V produkci tohle musí ještě zavolat ComGate Stop Recurring API,
// aby se nepokračovalo v rekurentním stahování. Zatím out of scope.

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const reason: string | null = body?.reason && typeof body.reason === "string"
      ? body.reason.slice(0, 1000)
      : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_type, subscription_expires_at, cancel_at_period_end")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Profil nenalezen" }, { status: 404 });
    if (profile.subscription_type === "free") {
      return NextResponse.json({ error: "Nemáte aktivní placené předplatné" }, { status: 400 });
    }
    if (profile.cancel_at_period_end) {
      return NextResponse.json({ error: "Předplatné už je naplánováno k ukončení" }, { status: 400 });
    }

    // Pokud nemáme expiry, doplníme ji z premium_subscriptions.next_billing_at.
    let expiresAt: string | null = profile.subscription_expires_at ?? null;
    if (!expiresAt) {
      const { data: sub } = await supabase
        .from("premium_subscriptions")
        .select("next_billing_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (sub?.next_billing_at) expiresAt = sub.next_billing_at as string;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        cancel_at_period_end: true,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        subscription_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ success: true, expiresAt });
  } catch (err) {
    console.error("Subscription cancel error:", err);
    return NextResponse.json({ error: "Interní chyba" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        cancel_at_period_end: false,
        cancellation_reason: null,
        cancelled_at: null,
      })
      .eq("id", user.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscription reactivate error:", err);
    return NextResponse.json({ error: "Interní chyba" }, { status: 500 });
  }
}
