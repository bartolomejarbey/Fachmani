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

  const { data: client } = await supabase.from("clients").select("id, emergency_fund_months").eq("user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch data
  const [contractsRes, investRes, paymentsRes] = await Promise.all([
    supabase.from("contracts").select("type, status, remaining_balance, insured_amount").eq("client_id", client.id),
    supabase.from("investments").select("current_value, type").eq("client_id", client.id),
    supabase.from("payments").select("status, due_date").eq("client_id", client.id),
  ]);

  const contracts = contractsRes.data || [];
  const investments = investRes.data || [];
  const payments = paymentsRes.data || [];

  // Calculate
  const totalDebt = contracts.filter(c => c.type === "loan" || c.type === "mortgage").reduce((s, c) => s + (c.remaining_balance || 0), 0);
  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const mortgageAmount = contracts.filter(c => c.type === "mortgage" || c.type === "loan").reduce((s, c) => s + (c.remaining_balance || 0), 0);
  const lifeInsurance = contracts.filter(c => c.type === "insurance_life").reduce((s, c) => s + (c.insured_amount || 0), 0);

  // Scoring
  let score = 0;
  const breakdown: Record<string, { score: number; max: number; label: string }> = {};

  // 1. Debt to assets ratio (max 30)
  const debtRatio = totalAssets > 0 ? totalDebt / totalAssets : (totalDebt > 0 ? 999 : 0);
  const debtScore = debtRatio < 0.5 ? 30 : debtRatio < 1 ? 15 : 0;
  breakdown.debt_ratio = { score: debtScore, max: 30, label: "Poměr dluhů k aktivům" };
  score += debtScore;

  // 2. Emergency fund (max 25)
  const emergencyMonths = client.emergency_fund_months || 0;
  const emergencyScore = emergencyMonths >= 6 ? 25 : emergencyMonths >= 3 ? 15 : 0;
  breakdown.emergency = { score: emergencyScore, max: 25, label: "Nouzová rezerva" };
  score += emergencyScore;

  // 3. Diversification (max 15)
  const productTypes = new Set([...contracts.map(c => c.type), ...investments.map(i => i.type)]);
  const diversScore = productTypes.size >= 3 ? 15 : productTypes.size >= 2 ? 10 : 5;
  breakdown.diversification = { score: diversScore, max: 15, label: "Diverzifikace" };
  score += diversScore;

  // 4. Insurance coverage (max 20)
  const insuranceScore = mortgageAmount > 0 ? (lifeInsurance >= mortgageAmount ? 20 : lifeInsurance > 0 ? 10 : 0) : (lifeInsurance > 0 ? 20 : 10);
  breakdown.insurance = { score: insuranceScore, max: 20, label: "Pojistná ochrana" };
  score += insuranceScore;

  // 5. Payment timeliness (max 10)
  const overdue = payments.filter(p => p.status === "overdue" || (p.status === "pending" && new Date(p.due_date) < new Date())).length;
  const timelinessScore = overdue === 0 ? 10 : overdue <= 2 ? 5 : 0;
  breakdown.timeliness = { score: timelinessScore, max: 10, label: "Včasnost plateb" };
  score += timelinessScore;

  // Recommendations
  const recommendations: string[] = [];
  if (debtScore < 30) recommendations.push("Snižte poměr dluhů k aktivům pod 50%");
  if (emergencyScore < 25) recommendations.push("Vytvořte si nouzovou rezervu alespoň na 6 měsíců");
  if (diversScore < 15) recommendations.push("Diverzifikujte své portfolio do více typů produktů");
  if (insuranceScore < 20) recommendations.push("Zajistěte dostatečné pojistné krytí");
  if (timelinessScore < 10) recommendations.push("Uhraďte platby po splatnosti");

  return NextResponse.json({ score, breakdown, recommendations });
}
