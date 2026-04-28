// ARES cache — 30denní DB cache ARES lookupů
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AresResult, StructuredAddress } from "./client";

type Supabase = SupabaseClient<any, any, any>;

// 'inactive' subjekty cachujeme se status='ok' v DB (CHECK constraint),
// ale payload nese příznak _inactive — readCache to rozezná a vrátí AresInactive.
type InactiveMarker = {
  _inactive: { reason: "deleted" | "never_active" };
};

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
    structuredAddress?: StructuredAddress | null;
    datumVzniku?: string | null;
    datumZaniku?: string | null;
    registrationStates?: Record<string, string>;
    raw?: unknown;
  } & Partial<InactiveMarker>;

  if (p._inactive) {
    return {
      status: "inactive",
      ico: data.ico,
      name: p.name ?? null,
      reason: p._inactive.reason,
      datumZaniku: p.datumZaniku ?? null,
      registrationStates: p.registrationStates ?? {},
      raw: p.raw ?? null,
    };
  }

  return {
    status: "ok",
    ico: data.ico,
    name: p.name || "",
    legalForm: p.legalForm ?? null,
    dic: p.dic ?? null,
    address: p.address ?? null,
    structuredAddress: p.structuredAddress ?? null,
    datumVzniku: p.datumVzniku ?? null,
    datumZaniku: p.datumZaniku ?? null,
    registrationStates: p.registrationStates ?? {},
    raw: p.raw ?? null,
  };
}

export async function writeCache(
  supabase: Supabase,
  result: AresResult
): Promise<void> {
  let payload: Record<string, unknown> = {};
  let dbStatus: "ok" | "not_found" | "error" = "ok";

  if (result.status === "ok") {
    payload = {
      name: result.name,
      legalForm: result.legalForm,
      dic: result.dic,
      address: result.address,
      structuredAddress: result.structuredAddress,
      datumVzniku: result.datumVzniku,
      datumZaniku: result.datumZaniku,
      registrationStates: result.registrationStates,
      raw: result.raw,
    };
    dbStatus = "ok";
  } else if (result.status === "inactive") {
    payload = {
      name: result.name,
      datumZaniku: result.datumZaniku,
      registrationStates: result.registrationStates,
      raw: result.raw,
      _inactive: { reason: result.reason },
    };
    dbStatus = "ok";
  } else if (result.status === "error") {
    payload = { message: result.message };
    dbStatus = "error";
  } else {
    payload = {};
    dbStatus = "not_found";
  }

  const ttlDays = dbStatus === "ok" ? 30 : dbStatus === "not_found" ? 7 : 1;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString();

  await supabase.from("ares_cache").upsert(
    {
      ico: result.ico,
      payload,
      status: dbStatus,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "ico" }
  );
}
