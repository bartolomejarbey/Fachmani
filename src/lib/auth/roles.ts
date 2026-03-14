import { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "superadmin" | "advisor" | "client" | null;

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  // 1. Check superadmin first
  const { data: superadmin } = await supabase
    .from("superadmins")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (superadmin) return "superadmin";

  // 2. Check client BEFORE advisor — client user_id must take priority
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (client) return "client";

  // 3. Check advisor last
  const { data: advisor } = await supabase
    .from("advisors")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (advisor) return "advisor";

  return null;
}

export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case "superadmin":
      return "/superadmin";
    case "advisor":
      return "/advisor";
    case "client":
      return "/portal";
    default:
      return "/login";
  }
}
