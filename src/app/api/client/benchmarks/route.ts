import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase.from("clients").select("id, advisor_id").eq("user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all clients of same advisor for benchmarks
  const { data: allClients } = await supabase.from("clients").select("id").eq("advisor_id", client.advisor_id);
  const clientIds = (allClients || []).map(c => c.id);

  if (clientIds.length < 2) {
    return NextResponse.json({ avgRate: null, avgNetWorth: null, avgScore: null, message: "Nedostatek dat pro porovnání" });
  }

  // Average loan rate (mock - would need interest_rate column)
  const { data: investments } = await supabase.from("investments").select("current_value, client_id").in("client_id", clientIds);
  const { data: contracts } = await supabase.from("contracts").select("remaining_balance, client_id, type").in("client_id", clientIds);

  // Calculate per-client net worth, then average
  const netWorths: Record<string, number> = {};
  (investments || []).forEach(i => { netWorths[i.client_id] = (netWorths[i.client_id] || 0) + (i.current_value || 0); });
  (contracts || []).filter(c => c.type === "loan" || c.type === "mortgage").forEach(c => { netWorths[c.client_id] = (netWorths[c.client_id] || 0) - (c.remaining_balance || 0); });

  const values = Object.values(netWorths);
  const avgNetWorth = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  // Client's own net worth
  const myNetWorth = netWorths[client.id] || 0;

  return NextResponse.json({ avgNetWorth, myNetWorth, clientCount: clientIds.length });
}
