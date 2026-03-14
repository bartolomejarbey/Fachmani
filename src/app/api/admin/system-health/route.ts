import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const tables = ["advisors", "clients", "deals", "contracts", "documents", "error_logs", "audit_logs", "tickets"];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    counts[table] = count || 0;
  }

  // Active users (last 24h, 7d, 30d)
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [d1, d7, d30] = await Promise.all([
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", day),
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", week),
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", month),
  ]);

  // Recent errors
  const { count: criticalErrors } = await supabase
    .from("error_logs")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .gte("created_at", day);

  return NextResponse.json({
    status: "healthy",
    timestamp: now.toISOString(),
    counts,
    activeUsers: { day: d1.count || 0, week: d7.count || 0, month: d30.count || 0 },
    criticalErrors24h: criticalErrors || 0,
  });
}
