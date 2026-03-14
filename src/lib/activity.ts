import { createClient } from "@/lib/supabase/client";

export async function logActivity(
  action: string,
  page: string,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!client) return;

    await supabase.from("client_activity_log").insert({
      client_id: client.id,
      action,
      page,
      metadata: metadata || {},
    });
  } catch {
    // Silently fail - activity logging should never break the app
  }
}
