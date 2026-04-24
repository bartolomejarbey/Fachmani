import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { normalizeQuery, isValidQuery } from "@/lib/search/query";
import { checkSearchRateLimit, extractIp } from "@/lib/search/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";

  if (!isValidQuery(q)) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = extractIp(req);
  const rl = await checkSearchRateLimit(supabase, ip, user?.id || null);
  if (!rl.ok) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const normalized = normalizeQuery(q);

  const { data: rows, error } = await supabase.rpc("search_suggest", {
    p_query_norm: normalized,
    p_limit: 8,
  });

  if (error) {
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }

  return NextResponse.json({ suggestions: rows || [] });
}
