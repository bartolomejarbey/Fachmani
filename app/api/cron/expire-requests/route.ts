import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCron } from "@/lib/cronAuth";

export const runtime = "nodejs";

// /api/cron/expire-requests
// Volá Vercel Cron 1× denně. Označí aktivní poptávky po expires_at jako 'closed_expired'
// (expire_old_requests). Bez tohoto cronu se poptávky nikdy neexpirovaly.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.rpc("expire_old_requests");
  if (error) {
    console.error("[cron/expire-requests]", error.message);
    return NextResponse.json({ error: "RPC selhalo" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expired: data ?? 0 });
}

export const GET = POST;
