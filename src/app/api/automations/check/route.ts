import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  const { dealId, triggerType, triggerData } = await request.json();

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

  // Get active automations for this trigger type
  const { data: automations } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("advisor_id", advisor.id)
    .eq("is_active", true)
    .eq("trigger_type", triggerType);

  if (!automations || automations.length === 0) {
    return NextResponse.json({ executed: 0 });
  }

  let executed = 0;

  for (const automation of automations) {
    try {
      let shouldExecute = false;

      // Check trigger conditions
      if (triggerType === "stage_change") {
        const targetStage = automation.trigger_config?.stage_name;
        if (!targetStage || triggerData?.newStageName?.toLowerCase().includes(targetStage.toLowerCase())) {
          shouldExecute = true;
        }
      } else if (triggerType === "deal_created" || triggerType === "deal_won" || triggerType === "deal_lost") {
        shouldExecute = true;
      }

      if (!shouldExecute) continue;

      // Execute action
      if (automation.action_type === "create_activity" && dealId) {
        await supabaseAdmin.from("activities").insert({
          deal_id: dealId,
          advisor_id: advisor.id,
          type: automation.action_config?.activity_type || "meeting",
          note: automation.action_config?.note || `Automaticky vytvořeno: ${automation.name}`,
        });
      } else if (automation.action_type === "create_reminder" && dealId) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (automation.action_config?.days_offset || 1));
        await supabaseAdmin.from("reminders").insert({
          advisor_id: advisor.id,
          deal_id: dealId,
          title: automation.action_config?.title || automation.name,
          due_date: dueDate.toISOString(),
        });
      } else if (automation.action_type === "notify") {
        // Just log it — notification shown on frontend
      }

      // Log execution
      await supabaseAdmin.from("automation_logs").insert({
        automation_id: automation.id,
        deal_id: dealId || null,
        status: "success",
        details: { trigger: triggerType, data: triggerData },
      });

      executed++;
    } catch {
      await supabaseAdmin.from("automation_logs").insert({
        automation_id: automation.id,
        deal_id: dealId || null,
        status: "error",
        details: { trigger: triggerType, error: "Execution failed" },
      });
    }
  }

  return NextResponse.json({ executed });
}
