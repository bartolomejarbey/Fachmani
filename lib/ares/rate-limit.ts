// ARES rate limiting — SECURITY DEFINER RPC (check_ares_rate_limit)
// Limity: 10 requestů/min per IP, 30 requestů/min per přihlášený user.
// Funkce check_ares_rate_limit zároveň zapisuje hit i kontroluje limit
// v sliding-window 1 minuta — volajíc ji nemusí samostatně recordovat.
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<any, any, any>;

export type RateLimitResult = { ok: boolean; retryAfterSec?: number; reason?: string };

type RpcResult = {
  allowed: boolean;
  count: number;
  limit: number;
  reset_at: string;
};

async function callCheck(
  supabase: Supabase,
  keyType: "ip" | "user",
  keyValue: string
): Promise<RpcResult | null> {
  const { data, error } = await supabase.rpc("check_ares_rate_limit", {
    p_key_type: keyType,
    p_key_value: keyValue,
  });
  if (error || !data) return null;
  return data as RpcResult;
}

function retryAfterSeconds(resetAt: string): number {
  const ms = new Date(resetAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 1000));
}

export async function checkRateLimit(
  supabase: Supabase,
  ip: string,
  userId: string | null
): Promise<RateLimitResult> {
  const ipRes = await callCheck(supabase, "ip", ip);
  if (ipRes && !ipRes.allowed) {
    return {
      ok: false,
      retryAfterSec: retryAfterSeconds(ipRes.reset_at),
      reason: `Překročen limit ${ipRes.limit} dotazů/min z vaší IP.`,
    };
  }

  if (userId) {
    const userRes = await callCheck(supabase, "user", userId);
    if (userRes && !userRes.allowed) {
      return {
        ok: false,
        retryAfterSec: retryAfterSeconds(userRes.reset_at),
        reason: `Překročen limit ${userRes.limit} dotazů/min pro váš účet.`,
      };
    }
  }

  return { ok: true };
}

export function extractIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}
