import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await supabaseAdmin
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Get active rules
  const { data: rules } = await supabaseAdmin
    .from("upsell_rules")
    .select("*")
    .eq("advisor_id", advisor.id)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (!rules || rules.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  // Get clients with related data
  const { data: clients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, segment, score")
    .eq("advisor_id", advisor.id);

  if (!clients || clients.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  const { data: investments } = await supabaseAdmin
    .from("investments")
    .select("client_id, current_value, type")
    .in("client_id", clients.map((c) => c.id));

  const { data: contracts } = await supabaseAdmin
    .from("contracts")
    .select("client_id, status, valid_to, title")
    .in("client_id", clients.map((c) => c.id));

  let generated = 0;

  for (const rule of rules) {
    for (const client of clients) {
      let matches = false;
      let alertTitle = "";
      let alertDescription = "";

      const clientInvestments = (investments || []).filter((i) => i.client_id === client.id);
      const clientContracts = (contracts || []).filter((c) => c.client_id === client.id);
      const portfolioValue = clientInvestments.reduce((s, i) => s + (i.current_value || 0), 0);

      switch (rule.condition_type) {
        case "portfolio_value": {
          const threshold = rule.condition_config?.min_value || 0;
          if (portfolioValue >= threshold) {
            matches = true;
            alertTitle = `${client.first_name} ${client.last_name} — ${rule.name}`;
            alertDescription = `Portfolio ${portfolioValue.toLocaleString("cs-CZ")} Kč. ${rule.recommendation}`;
          }
          break;
        }
        case "no_product": {
          const productType = rule.condition_config?.product_type;
          const hasProduct = clientInvestments.some((i) => i.type === productType) ||
            clientContracts.some((c) => c.title?.toLowerCase().includes(productType?.toLowerCase() || ""));
          if (!hasProduct) {
            matches = true;
            alertTitle = `${client.first_name} ${client.last_name} — ${rule.name}`;
            alertDescription = `Klient nemá produkt typu "${productType}". ${rule.recommendation}`;
          }
          break;
        }
        case "contract_expiring": {
          const daysAhead = rule.condition_config?.days_ahead || 30;
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + daysAhead);
          const expiring = clientContracts.filter(
            (c) => c.status === "active" && c.valid_to && new Date(c.valid_to) <= deadline
          );
          if (expiring.length > 0) {
            matches = true;
            alertTitle = `${client.first_name} ${client.last_name} — ${rule.name}`;
            alertDescription = `${expiring.length} smluv brzy vyprší. ${rule.recommendation}`;
          }
          break;
        }
        case "segment": {
          const targetSegment = rule.condition_config?.segment;
          if (client.segment === targetSegment) {
            matches = true;
            alertTitle = `${client.first_name} ${client.last_name} — ${rule.name}`;
            alertDescription = `Klient v segmentu "${targetSegment}". ${rule.recommendation}`;
          }
          break;
        }
      }

      if (matches) {
        // Check if similar alert already exists (not dismissed)
        const { data: existing } = await supabaseAdmin
          .from("upsell_alerts")
          .select("id")
          .eq("advisor_id", advisor.id)
          .eq("client_id", client.id)
          .eq("rule_id", rule.id)
          .in("status", ["new", "viewed"])
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabaseAdmin.from("upsell_alerts").insert({
            advisor_id: advisor.id,
            client_id: client.id,
            rule_id: rule.id,
            title: alertTitle,
            description: alertDescription,
          });
          generated++;
        }
      }
    }
  }

  return NextResponse.json({ generated });
}
