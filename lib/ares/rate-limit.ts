// ARES rate limiting — DB-based sliding window (1 minuta)
// Limity: 10 requestů/min per IP, 30 requestů/min per přihlášený user
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<any, any, any>;

const WINDOW_MS = 60_000;
const IP_LIMIT = 10;
const USER_LIMIT = 30;

export type RateLimitResult = { ok: boolean; retryAfterSec?: number; reason?: string };

async function countSince(
  supabase: Supabase,
  keyType: "ip" | "user",
  keyValue: string,
  sinceIso: string
): Promise<number> {
  const { count } = await supabase
    .from("ares_rate_limit")
    .select("*", { count: "exact", head: true })
    .eq("key_type", keyType)
    .eq("key_value", keyValue)
    .gte("created_at", sinceIso);
  return count ?? 0;
}

export async function checkRateLimit(
  supabase: Supabase,
  ip: string,
  userId: string | null
): Promise<RateLimitResult> {
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();

  const ipCount = await countSince(supabase, "ip", ip, sinceIso);
  if (ipCount >= IP_LIMIT) {
    return {
      ok: false,
      retryAfterSec: 60,
      reason: `Překročen limit ${IP_LIMIT} dotazů/min z vaší IP.`,
    };
  }

  if (userId) {
    const userCount = await countSince(supabase, "user", userId, sinceIso);
    if (userCount >= USER_LIMIT) {
      return {
        ok: false,
        retryAfterSec: 60,
        reason: `Překročen limit ${USER_LIMIT} dotazů/min pro váš účet.`,
      };
    }
  }

  return { ok: true };
}

export async function recordHit(
  supabase: Supabase,
  ip: string,
  userId: string | null
): Promise<void> {
  const rows: { key_type: "ip" | "user"; key_value: string }[] = [
    { key_type: "ip", key_value: ip },
  ];
  if (userId) rows.push({ key_type: "user", key_value: userId });
  await supabase.from("ares_rate_limit").insert(rows);
}

export function extractIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}
