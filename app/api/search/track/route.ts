import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { normalizeQuery, isValidQuery } from "@/lib/search/query";

export const runtime = "nodejs";

type TrackBody = {
  query?: string;
  entityType?: string;
  entityId?: string;
  position?: number;
};

export async function POST(req: Request) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const query = (body.query || "").trim();
  const entityType = (body.entityType || "").trim();
  const entityId = (body.entityId || "").trim();
  const position = Number.isFinite(body.position) ? Number(body.position) : null;

  if (!isValidQuery(query)) {
    return NextResponse.json({ error: "Neplatný dotaz." }, { status: 400 });
  }
  if (!["provider", "seed_provider", "category"].includes(entityType)) {
    return NextResponse.json({ error: "Neplatný entity_type." }, { status: 400 });
  }
  if (!entityId || entityId.length > 100) {
    return NextResponse.json({ error: "Neplatný entity_id." }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("log_search_click", {
    p_query: query.slice(0, 200),
    p_query_norm: normalizeQuery(query),
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_position: position,
  });

  if (error) {
    return NextResponse.json({ error: "Logování selhalo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
