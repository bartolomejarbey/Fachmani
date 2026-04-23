import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const WINDOW_MS = 60_000;
const IP_LIMIT = 60;
const USER_LIMIT = 120;

export function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function hashIp(ip: string): string {
  const salt = process.env.SEARCH_IP_SALT || "fachmani-search";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "ip" | "user"; retryAfterSec: number };

export async function checkSearchRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count: ipCount } = await supabase
    .from("search_rate_limit")
    .select("id", { count: "exact", head: true })
    .eq("key_type", "ip")
    .eq("key_value", ip)
    .gte("created_at", since);

  if ((ipCount ?? 0) >= IP_LIMIT) {
    return { ok: false, reason: "ip", retryAfterSec: 60 };
  }

  if (userId) {
    const { count: userCount } = await supabase
      .from("search_rate_limit")
      .select("id", { count: "exact", head: true })
      .eq("key_type", "user")
      .eq("key_value", userId)
      .gte("created_at", since);

    if ((userCount ?? 0) >= USER_LIMIT) {
      return { ok: false, reason: "user", retryAfterSec: 60 };
    }
  }

  const rows = [
    { key_type: "ip", key_value: ip },
    ...(userId ? [{ key_type: "user", key_value: userId }] : []),
  ];
  await supabase.from("search_rate_limit").insert(rows);

  return { ok: true };
}
