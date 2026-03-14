import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { count: advisors, error: advErr } = await supabase
      .from("advisors")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (advErr) throw advErr;

    const { count: clients, error: cliErr } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    if (cliErr) throw cliErr;

    return NextResponse.json(
      { advisors: advisors || 0, clients: clients || 0 },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ advisors: 0, clients: 0 }, { status: 200 });
  }
}
