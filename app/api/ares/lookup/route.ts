import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isValidIco } from "@/lib/ares/validate";
import { lookupAres } from "@/lib/ares/client";
import { readCache, writeCache } from "@/lib/ares/cache";
import { checkRateLimit, recordHit, extractIp } from "@/lib/ares/rate-limit";

export const runtime = "nodejs";

type LookupBody = { ico?: string };

export async function POST(req: NextRequest) {
  let body: LookupBody = {};
  try {
    body = (await req.json()) as LookupBody;
  } catch {
    return NextResponse.json(
      { error: "Neplatný JSON v těle požadavku." },
      { status: 400 }
    );
  }

  const rawIco = (body.ico || "").replace(/\D+/g, "");
  if (!isValidIco(rawIco)) {
    return NextResponse.json(
      {
        error: "Neplatné IČO. IČO musí mít 8 číslic a platnou kontrolní číslici.",
        field: "ico",
      },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = extractIp(req.headers);

  const rl = await checkRateLimit(supabase, ip, user?.id ?? null);
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.reason || "Překročen limit požadavků." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  // Pokusíme se nejprve cache
  const cached = await readCache(supabase, rawIco);
  if (cached) {
    await recordHit(supabase, ip, user?.id ?? null);
    return NextResponse.json({ source: "cache", result: cached });
  }

  // Live dotaz na ARES
  const result = await lookupAres(rawIco);
  await recordHit(supabase, ip, user?.id ?? null);

  // Cache i chyby (s krátkým TTL) — aby se nezatěžoval ARES
  await writeCache(supabase, result);

  if (result.status === "error") {
    return NextResponse.json(
      { source: "live", result, error: result.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ source: "live", result });
}
