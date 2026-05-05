import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// A.F5 (admin) — manuální potvrzení bank ověření
// POST /api/admin/bank-verification/confirm { user_id, status: 'verified'|'failed' }

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  // Ověř že user je admin
  const { data: me } = await supabase
    .from("profiles")
    .select("admin_role")
    .eq("id", user.id)
    .single();
  if (!me?.admin_role) {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { user_id?: string; status?: "verified" | "failed" }
    | null;
  const target = body?.user_id;
  const status = body?.status;
  if (!target || (status !== "verified" && status !== "failed")) {
    return NextResponse.json({ error: "Chybí user_id nebo status" }, { status: 400 });
  }

  // Service role pro update (vyhne se RLS specifikám pro tento admin write)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin
    .from("profiles")
    .update({
      bank_verification_status: status,
      bank_verification_verified_at: status === "verified" ? new Date().toISOString() : null,
    })
    .eq("id", target);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("admin_activity_log").insert({
    admin_id: user.id,
    action: "bank_verification_confirm",
    target_type: "user",
    target_id: target,
    details: { status },
  });

  return NextResponse.json({ ok: true });
}
