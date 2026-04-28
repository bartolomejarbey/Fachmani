import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isValidIco } from "@/lib/ares/validate";
import { lookupAres } from "@/lib/ares/client";
import { readCache, writeCache } from "@/lib/ares/cache";
import { checkRateLimit, extractIp } from "@/lib/ares/rate-limit";

export const runtime = "nodejs";

type VerifyBody = { ico?: string };

/**
 * POST /api/ares/verify
 * Ověří IČO v ARES a výsledek (pokud 'ok') uloží do profiles.ares_verified_at,
 * ares_verified_name, ares_payload a profiles.ico (pokud nebyl dosud vyplněn).
 * Pole is_verified zatím nemění — to je druhý krok (manuální/ručně-admin).
 */
export async function POST(req: NextRequest) {
  let body: VerifyBody = {};
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const ico = (body.ico || "").replace(/\D+/g, "");
  if (!isValidIco(ico)) {
    return NextResponse.json(
      { error: "Neplatné IČO.", field: "ico" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Pro ověření IČO musíte být přihlášeni." },
      { status: 401 }
    );
  }

  const ip = extractIp(req.headers);
  const rl = await checkRateLimit(supabase, ip, user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.reason || "Překročen limit." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  let result = await readCache(supabase, ico);
  if (!result) {
    result = await lookupAres(ico);
    await writeCache(supabase, result);
  }

  if (result.status === "inactive") {
    const reason =
      result.reason === "deleted"
        ? `Subjekt v ARES je zaniklý${result.datumZaniku ? ` (datum zániku ${result.datumZaniku})` : ""}.`
        : "Subjekt v ARES není aktivní v žádném z rejstříků.";
    return NextResponse.json(
      { result, error: reason },
      { status: 422 }
    );
  }

  if (result.status !== "ok") {
    return NextResponse.json(
      {
        result,
        error:
          result.status === "not_found"
            ? "Subjekt s tímto IČO nebyl v ARES nalezen."
            : result.message,
      },
      { status: result.status === "not_found" ? 404 : 502 }
    );
  }

  await supabase
    .from("profiles")
    .update({
      ico: result.ico,
      ares_verified_at: new Date().toISOString(),
      ares_verified_name: result.name,
      ares_payload: {
        name: result.name,
        legalForm: result.legalForm,
        dic: result.dic,
        address: result.address,
        structuredAddress: result.structuredAddress,
        raw: result.raw,
      },
      legal_address: result.structuredAddress
        ? {
            street: result.structuredAddress.street,
            house_number: result.structuredAddress.house_number,
            orientation_number: result.structuredAddress.orientation_number,
            city: result.structuredAddress.city,
            postal_code: result.structuredAddress.postal_code,
            country: result.structuredAddress.country,
            source: "ares",
            verified_at: new Date().toISOString(),
          }
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({ result });
}
