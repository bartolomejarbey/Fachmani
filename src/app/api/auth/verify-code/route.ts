import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { user_id, code } = await request.json();

  if (!user_id || !code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check attempt count (max 3)
  const { count } = await supabase
    .from("verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString());

  if (count === 0) {
    return NextResponse.json({ error: "Žádný platný kód nenalezen. Vyžádejte nový." }, { status: 400 });
  }

  const { data: verification } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("user_id", user_id)
    .eq("code", code)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!verification) {
    return NextResponse.json({ error: "Neplatný nebo expirovaný kód." }, { status: 400 });
  }

  await supabase
    .from("verification_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", verification.id);

  return NextResponse.json({ ok: true, verified: true });
}
