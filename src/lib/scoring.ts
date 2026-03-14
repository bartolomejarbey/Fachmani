import { SupabaseClient } from "@supabase/supabase-js";

export interface ScoringResult {
  score: number;
  segment: string;
}

export function getSegment(score: number, daysSinceCreated: number, daysSinceLastActivity: number): string {
  if (daysSinceCreated < 30) return "new";
  if (daysSinceLastActivity > 90) return "sleeping";
  if (score >= 80) return "vip";
  if (score >= 50) return "active";
  if (score >= 25) return "standard";
  return "sleeping";
}

export const SEGMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vip: { label: "VIP", color: "text-amber-700", bg: "bg-amber-100" },
  active: { label: "Aktivní", color: "text-emerald-700", bg: "bg-emerald-100" },
  standard: { label: "Standardní", color: "text-blue-700", bg: "bg-blue-100" },
  sleeping: { label: "Spící", color: "text-slate-600", bg: "bg-slate-100" },
  new: { label: "Nový", color: "text-violet-700", bg: "bg-violet-100" },
};

export async function calculateClientScore(
  supabase: SupabaseClient,
  clientId: string
): Promise<ScoringResult> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [investmentsRes, contractsRes, activitiesRes, dealsRes, clientRes] = await Promise.all([
    supabase
      .from("investments")
      .select("current_value")
      .eq("client_id", clientId),
    supabase
      .from("contracts")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "active"),
    supabase
      .from("deal_activities")
      .select("id")
      .in(
        "deal_id",
        (await supabase.from("deals").select("id").eq("client_id", clientId)).data?.map((d) => d.id) || []
      )
      .gte("created_at", ninetyDaysAgo),
    supabase
      .from("deals")
      .select("id")
      .eq("client_id", clientId),
    supabase
      .from("clients")
      .select("created_at")
      .eq("id", clientId)
      .single(),
  ]);

  const portfolioValue = (investmentsRes.data || []).reduce(
    (sum, inv) => sum + (inv.current_value || 0),
    0
  );
  const contractCount = contractsRes.data?.length || 0;
  const activityCount = activitiesRes.data?.length || 0;
  const dealCount = dealsRes.data?.length || 0;

  // Normalize scores (0-100 scale per factor)
  const portfolioScore = Math.min(portfolioValue / 10000, 100); // 1M = 100
  const contractScore = Math.min(contractCount * 20, 100); // 5 contracts = 100
  const activityScore = Math.min(activityCount * 10, 100); // 10 activities = 100
  const dealScore = Math.min(dealCount * 15, 100); // ~7 deals = 100

  const score = Math.round(
    portfolioScore * 0.3 +
    contractScore * 0.2 +
    activityScore * 0.25 +
    dealScore * 0.25
  );

  const daysSinceCreated = clientRes.data
    ? Math.floor((Date.now() - new Date(clientRes.data.created_at).getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  // For last activity, use the most recent deal_activity
  const daysSinceLastActivity = activityCount > 0 ? 0 : 91;

  const segment = getSegment(score, daysSinceCreated, daysSinceLastActivity);

  return { score: Math.min(score, 100), segment };
}
