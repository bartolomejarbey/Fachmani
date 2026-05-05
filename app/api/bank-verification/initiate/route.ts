import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { czAccountToIban, buildSpayd, spaydToQrDataUrl } from "@/lib/payment-qr";

export const runtime = "nodejs";

// A.F5 — fachman spustí bankovní ověření
// POST /api/bank-verification/initiate { account: "1234567890/0100" }
// Vrací { amount_haler, reference_vs, initiated_at, target_account }
// Side-effect: notifikuje všechny adminy (NotificationBell + admin queue badge).

const TARGET_ACCOUNT = process.env.BANK_VERIFICATION_TARGET_ACCOUNT || "TODO/0000";

function isValidCzAccount(s: string): boolean {
  // Velmi přibližná validace: prefix-?číslo/kód, 4 cifry kód banky
  return /^(\d{0,6}-)?\d{2,10}\/\d{4}$/.test(s.trim());
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { account?: string } | null;
  const account = body?.account?.trim() || "";
  if (!isValidCzAccount(account)) {
    return NextResponse.json({ error: "Neplatný formát čísla účtu (např. 1234567890/0100)" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("initiate_bank_verification", {
    p_user_id: user.id,
    p_account: account,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    amount_haler: number;
    reference_vs: string;
    initiated_at: string;
  } | null;

  if (!row) return NextResponse.json({ error: "RPC nevrátilo data" }, { status: 500 });

  // Pošli notifikaci všem adminům (service role, mimo user RLS)
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: profileMe } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .not("admin_role", "is", null);
    if (admins && admins.length > 0) {
      const displayName = profileMe?.full_name || profileMe?.email || "Fachman";
      await admin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.id,
          type: "bank_verification_pending",
          title: "💳 Nové bank ověření čeká",
          message: `${displayName} spustil/a 1 Kč ověření (${(row.amount_haler / 100).toFixed(2)} Kč, VS ${row.reference_vs})`,
          link: "/admin/verifikace",
          is_read: false,
          created_at: new Date().toISOString(),
        })),
      );
    }
    // Activity log pro audit
    await admin.from("admin_activity_log").insert({
      admin_id: null,
      action: "bank_verification_initiated",
      target_type: "user",
      target_id: user.id,
      details: {
        account,
        amount_haler: row.amount_haler,
        reference_vs: row.reference_vs,
      },
    });
  } catch (e) {
    // Notifikace selhání nesmí blokovat ověření — jen logni
    console.error("[bank-verification/initiate] notify admins failed:", e);
  }

  // Vygeneruj SPAYD QR pro snadné scan v bankovní aplikaci.
  const targetIban = czAccountToIban(TARGET_ACCOUNT);
  let qrDataUrl: string | null = null;
  let spayd: string | null = null;
  if (targetIban) {
    spayd = buildSpayd({
      iban: targetIban,
      amountKc: (row.amount_haler / 100).toFixed(2),
      vs: row.reference_vs,
      message: "Fachmani overeni",
      recipient: "Fachmani",
    });
    try {
      qrDataUrl = await spaydToQrDataUrl(spayd);
    } catch (e) {
      console.error("[bank-verification] QR generation failed:", e);
    }
  }

  return NextResponse.json({
    amount_haler: row.amount_haler,
    amount_kc: (row.amount_haler / 100).toFixed(2),
    reference_vs: row.reference_vs,
    initiated_at: row.initiated_at,
    target_account: TARGET_ACCOUNT,
    target_iban: targetIban,
    spayd,
    qr_data_url: qrDataUrl,
    instructions: `Pošlete přesně ${(row.amount_haler / 100).toFixed(2)} Kč na účet ${TARGET_ACCOUNT} s variabilním symbolem ${row.reference_vs}. Po manuálním potvrzení adminem (obvykle do 24h) bude váš účet ověřen.`,
  });
}
