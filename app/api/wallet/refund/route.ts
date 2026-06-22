import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// POST /api/wallet/refund { type: 'offer_publish', relatedEntityId }
// Vrátí kredit za akci, která byla zpoplatněna PŘED insertem a insert selhal
// (charge-before-insert money-loss). Bezpečné proti zneužití:
//   - vrací jen pokud existuje reálný (un-refunded) charge daného typu pro relatedEntityId
//   - jen pokud daná akce NEvznikla (u offer_publish: na poptávce není uživatelova nabídka)
//   - idempotentní (druhé volání refund už nic nepřipíše)
const REFUNDABLE = new Set(["offer_publish"]);

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  const { type, relatedEntityId } = (await request.json().catch(() => ({}))) as {
    type?: string;
    relatedEntityId?: string;
  };
  if (!type || !REFUNDABLE.has(type) || !relatedEntityId) {
    return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const sb = admin();

  // 1) reálný charge pro tento relatedEntityId
  const { data: charge } = await sb
    .from("wallet_transactions")
    .select("id, wallet_id, amount_kc")
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("related_entity_id", relatedEntityId)
    .lt("amount_kc", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!charge) return NextResponse.json({ error: "Žádná platba k vrácení" }, { status: 400 });

  // 2) už refundováno? → idempotentně ok
  const { data: existingRefund } = await sb
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "refund")
    .eq("related_entity_id", relatedEntityId)
    .maybeSingle();
  if (existingRefund) return NextResponse.json({ ok: true, alreadyRefunded: true });

  // 3) akce nesmí být úspěšná — u offer_publish: na poptávce není uživatelova nabídka
  if (type === "offer_publish") {
    const { count } = await sb
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("request_id", relatedEntityId)
      .eq("provider_id", user.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "Akce proběhla, nelze vrátit" }, { status: 409 });
    }
  }

  // 4) připsat zpět + log refund (dvojí refund blokuje kontrola existingRefund výše)
  const refundAmount = Math.abs(charge.amount_kc);
  const { data: wallet } = await sb.from("wallets").select("balance_kc").eq("id", charge.wallet_id).single();
  const newBalance = (wallet?.balance_kc ?? 0) + refundAmount;
  await sb
    .from("wallets")
    .update({ balance_kc: newBalance, updated_at: new Date().toISOString() })
    .eq("id", charge.wallet_id);
  await sb.from("wallet_transactions").insert({
    wallet_id: charge.wallet_id,
    user_id: user.id,
    type: "refund",
    amount_kc: refundAmount,
    balance_after_kc: newBalance,
    description: "Vrácení platby (akce neproběhla)",
    related_entity_id: relatedEntityId,
  });

  return NextResponse.json({ ok: true, refunded: refundAmount, newBalance });
}
