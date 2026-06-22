import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/cronAuth";

export const runtime = "nodejs";

// /api/cron/subscription-downgrade
// Volá Vercel Cron 1× denně. Degraduje zrušená předplatná po konci období na 'free'
// (auto_downgrade_cancelled_subscriptions). Bez tohoto cronu placené předplatné nikdy
// nedegradovalo — uživatel měl premium napořád i po zrušení a vypršení období.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.rpc("auto_downgrade_cancelled_subscriptions");
  if (error) {
    console.error("[cron/subscription-downgrade]", error.message);
    return NextResponse.json({ error: "RPC selhalo" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, downgraded: data ?? 0 });
}

export const GET = POST;
