import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lookupAres } from "@/lib/ares/client";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: dej time na batch lookupů

// A.F6 — ARES re-verifikace cron
// Volá se externím cronem (Vercel cron / pg_cron). Chráněno headerem.
//
// GET /api/cron/ares-reverify?max_age_days=30&limit=50
// Header: x-cron-secret: <CRON_SECRET>
//
// Pro každý kandidát:
//   - lookupAres(ico)
//   - update profiles.ares_verified_at, ares_verified_name, ares_payload, legal_address
//   - log do admin_activity_log
//
// Mezi voláními delay (rate limit ARES je veřejný, ale slušnost).

const CALL_DELAY_MS = 200;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET není nastaven na serveru" }, { status: 500 });
  }
  // Vercel Cron posílá `Authorization: Bearer ${CRON_SECRET}` automaticky.
  // Fallback: x-cron-secret nebo ?secret= pro lokální / manuální triggery.
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });
  }

  const maxAgeDays = parseInt(req.nextUrl.searchParams.get("max_age_days") || "30");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 200);

  // Service role klient (cron běží mimo user kontext)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: candidates, error: candErr } = await admin.rpc("get_ares_reverify_candidates", {
    p_max_age_days: maxAgeDays,
    p_limit: limit,
  });

  if (candErr) {
    return NextResponse.json({ error: candErr.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0, message: "Žádní kandidáti k refreshi" });
  }

  let updated = 0;
  let inactive = 0;
  let failed = 0;
  const failures: Array<{ id: string; ico: string; reason: string }> = [];

  for (const c of candidates as Array<{ id: string; ico: string; ares_verified_at: string | null }>) {
    try {
      const result = await lookupAres(c.ico);

      if (result.status === "ok") {
        await admin.from("profiles").update({
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
        }).eq("id", c.id);
        updated++;
      } else if (result.status === "inactive") {
        // Subjekt zaniklý — zaznamenáme ale nepřepisujeme jméno (zachovat historii)
        await admin.from("profiles").update({
          ares_verified_at: new Date().toISOString(),
          ares_payload: { ...(result as unknown as Record<string, unknown>), inactive: true },
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);
        inactive++;
      } else {
        failed++;
        failures.push({
          id: c.id,
          ico: c.ico,
          reason: result.status === "not_found" ? "not_found" : (result as { message?: string }).message || "error",
        });
      }
    } catch (err) {
      failed++;
      failures.push({ id: c.id, ico: c.ico, reason: err instanceof Error ? err.message : "unknown" });
    }

    // Slušnost vůči ARES API
    await new Promise((r) => setTimeout(r, CALL_DELAY_MS));
  }

  // Activity log
  await admin.from("admin_activity_log").insert({
    admin_id: null,
    action: "cron_ares_reverify",
    target_type: "system",
    target_id: null,
    details: { checked: candidates.length, updated, inactive, failed },
  });

  return NextResponse.json({
    checked: candidates.length,
    updated,
    inactive,
    failed,
    failures: failures.slice(0, 20),
  });
}
