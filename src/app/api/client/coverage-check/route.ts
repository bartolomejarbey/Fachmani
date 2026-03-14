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

  const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: contracts } = await supabase.from("contracts").select("type, status, remaining_balance, insured_amount").eq("client_id", client.id).eq("status", "active");

  const items = contracts || [];
  const hasMortgage = items.some(c => c.type === "mortgage" || c.type === "loan");
  const mortgageTotal = items.filter(c => c.type === "mortgage" || c.type === "loan").reduce((s, c) => s + (c.remaining_balance || 0), 0);
  const hasLifeInsurance = items.some(c => c.type === "insurance_life");
  const lifeInsuranceTotal = items.filter(c => c.type === "insurance_life").reduce((s, c) => s + (c.insured_amount || 0), 0);
  const hasPropertyInsurance = items.some(c => c.type === "insurance_property");
  const hasIncomeProtection = items.some(c => c.type === "income_protection");

  const checks: { id: string; title: string; description: string; status: "ok" | "warning" | "danger" }[] = [];

  // Check 1: Mortgage without life insurance
  if (hasMortgage && !hasLifeInsurance) {
    checks.push({ id: "mortgage_life", title: "Hypotéka bez životního pojištění", description: "Máte hypotéku, ale nemáte životní pojištění. V případě neočekávané události by rodina nesla finanční zátěž.", status: "danger" });
  } else if (hasMortgage && hasLifeInsurance && lifeInsuranceTotal < mortgageTotal) {
    const pct = Math.round((lifeInsuranceTotal / mortgageTotal) * 100);
    checks.push({ id: "mortgage_life", title: "Nedostatečné krytí hypotéky", description: `Vaše životní pojištění pokrývá jen ${pct}% hypotéky.`, status: "warning" });
  } else if (hasMortgage && hasLifeInsurance) {
    checks.push({ id: "mortgage_life", title: "Hypotéka kryta pojištěním", description: "Vaše životní pojištění dostatečně kryje hypotéku.", status: "ok" });
  }

  // Check 2: Income protection
  if (!hasIncomeProtection) {
    checks.push({ id: "income", title: "Chybí pojištění příjmu", description: "Nemáte pojištění pro případ nemoci nebo úrazu, který by omezil váš příjem.", status: "warning" });
  } else {
    checks.push({ id: "income", title: "Příjem chráněn", description: "Máte pojištění příjmu v případě nemoci.", status: "ok" });
  }

  // Check 3: Property insurance
  if (hasMortgage && !hasPropertyInsurance) {
    checks.push({ id: "property", title: "Chybí pojištění majetku", description: "Máte nemovitost, ale nemáte pojištění majetku.", status: "warning" });
  } else if (hasPropertyInsurance) {
    checks.push({ id: "property", title: "Majetek pojištěn", description: "Máte platné pojištění majetku.", status: "ok" });
  }

  // Check 4: Life insurance without mortgage (general)
  if (!hasMortgage && hasLifeInsurance) {
    checks.push({ id: "life_general", title: "Životní pojištění", description: "Máte životní pojištění i bez hypotéky — dobrá práce.", status: "ok" });
  } else if (!hasMortgage && !hasLifeInsurance) {
    checks.push({ id: "life_general", title: "Zvažte životní pojištění", description: "Životní pojištění chrání vaši rodinu v případě neočekávaných událostí.", status: "warning" });
  }

  const okCount = checks.filter(c => c.status === "ok").length;
  const total = checks.length;
  const coverageScore = total > 0 ? `${okCount}/${total}` : "0/0";

  return NextResponse.json({ checks, coverageScore, okCount, total });
}
