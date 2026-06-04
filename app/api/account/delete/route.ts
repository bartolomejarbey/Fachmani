import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Trvalé smazání účtu (App Store guideline 5.1.1(v) — povinné in-app smazání).
 * Ověří přihlášeného uživatele jeho session, poté service-role klientem smaže
 * jeho osobní data napříč tabulkami a nakonec auth účet.
 * Best-effort per tabulka (chybějící tabulka/řádek smazání nezablokuje).
 */
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const uid = user.id;
    const db = admin();
    const del = async (table: string, col: string) => {
      try { await db.from(table).delete().eq(col, uid); } catch { /* tabulka nemusí existovat */ }
    };

    // Závislá data (UGC, peněženka, notifikace, předplatné) — pořadí bezpečné díky best-effort.
    await del("post_reports", "user_id");
    await del("post_comments", "user_id");
    await del("post_likes", "user_id");
    await del("post_reactions", "user_id");
    await del("posts", "user_id");
    await del("offers", "provider_id");
    await del("reviews", "customer_id");
    await del("reviews", "provider_id");
    await del("customer_reviews", "customer_id");
    await del("customer_reviews", "provider_id");
    await del("messages", "sender_id");
    await del("notifications", "user_id");
    await del("push_subscriptions", "user_id");
    await del("wallet_transactions", "user_id");
    await del("wallets", "user_id");
    await del("premium_subscriptions", "user_id");
    await del("provider_categories", "provider_id");
    await del("provider_profiles", "user_id");
    await del("requests", "user_id"); // nabídky k poptávce mají ON DELETE CASCADE
    await del("profiles", "id");

    // Účetní doklady (faktury/platby) ponecháváme anonymizované kvůli zákonné archivaci —
    // nelze je smazat, ale již nejsou napojené na aktivní účet (profil je pryč).

    // Smazání samotného auth účtu.
    const { error: authErr } = await db.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error("[account/delete] deleteUser failed:", authErr.message);
      return NextResponse.json({ error: "Účet se nepodařilo smazat. Kontaktujte podporu na info@fachmani.org." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account/delete] error:", e);
    return NextResponse.json({ error: "Interní chyba" }, { status: 500 });
  }
}
