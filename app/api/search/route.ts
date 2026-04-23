import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { normalizeQuery, isValidQuery, sanitizeForWebsearch } from "@/lib/search/query";
import { checkSearchRateLimit, extractIp, hashIp } from "@/lib/search/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const entityFilter = url.searchParams.get("type");
  const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 20));

  if (!isValidQuery(q)) {
    return NextResponse.json(
      { error: "Dotaz musí mít 2–200 znaků." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = extractIp(req);
  const rl = await checkSearchRateLimit(supabase, ip, user?.id || null);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Příliš mnoho dotazů. Zkuste to za chvíli." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const normalized = normalizeQuery(q);
  const sanitized = sanitizeForWebsearch(q);
  const typeFilter =
    entityFilter === "provider_any" ||
    entityFilter === "provider" ||
    entityFilter === "seed_provider" ||
    entityFilter === "category"
      ? entityFilter
      : null;

  const { data: rows, error } = await supabase.rpc("search_entities", {
    p_query: sanitized,
    p_query_norm: normalized,
    p_entity_filter: typeFilter,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: "Vyhledávání selhalo." }, { status: 500 });
  }

  const results = rows || [];

  // Fire-and-forget logování (neblokuje response; chybějící await je záměrný).
  void supabase.rpc("log_search_query", {
    p_query: q.slice(0, 200),
    p_query_norm: normalized,
    p_ip_hash: hashIp(ip),
    p_result_count: results.length,
  });

  return NextResponse.json({ query: q, normalized, count: results.length, results });
}
