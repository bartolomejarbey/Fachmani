// ARES cache — 30denní DB cache ARES lookupů
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AresResult } from "./client";

type Supabase = SupabaseClient<any, any, any>;

export async function readCache(
  supabase: Supabase,
  ico: string
): Promise<AresResult | null> {
  const { data } = await supabase
    .from("ares_cache")
    .select("ico, payload, status, expires_at")
    .eq("ico", ico)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  if (data.status === "not_found") {
    return { status: "not_found", ico: data.ico };
  }
  if (data.status === "error") {
    const payload = data.payload as { message?: string } | null;
    return {
      status: "error",
      ico: data.ico,
      message: payload?.message || "Chyba z cache",
    };
  }

  const p = (data.payload || {}) as {
    name?: string;
    legalForm?: string | null;
    dic?: string | null;
    address?: string | null;
    raw?: unknown;
  };
  return {
    status: "ok",
    ico: data.ico,
    name: p.name || "",
    legalForm: p.legalForm ?? null,
    dic: p.dic ?? null,
    address: p.address ?? null,
    raw: p.raw ?? null,
  };
}

export async function writeCache(
  supabase: Supabase,
  result: AresResult
): Promise<void> {
  const payload: Record<string, unknown> =
    result.status === "ok"
      ? {
          name: result.name,
          legalForm: result.legalForm,
          dic: result.dic,
          address: result.address,
          raw: result.raw,
        }
      : result.status === "error"
      ? { message: result.message }
      : {};

  const ttlDays = result.status === "ok" ? 30 : result.status === "not_found" ? 7 : 1;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString();

  await supabase.from("ares_cache").upsert(
    {
      ico: result.ico,
      payload,
      status: result.status,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "ico" }
  );
}
