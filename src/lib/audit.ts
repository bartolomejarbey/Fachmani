import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function logAudit(
  userId: string | null,
  userRole: string,
  action: "create" | "update" | "delete" | "login" | "logout" | "impersonate" | "export",
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  ipAddress?: string
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress || null,
    });
  } catch (e) {
    console.error("Failed to log audit:", e);
  }
}
