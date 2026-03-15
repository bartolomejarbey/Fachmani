import { supabase } from "@/lib/supabase";

export function useAdminActions() {
  const logAction = async (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      ...(details ? { details } : {}),
    });
  };

  const handleVerify = async (userId: string, verify: boolean, onDone?: () => void) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: verify })
      .eq("id", userId);

    if (error) {
      alert("Nepodařilo se změnit stav ověření.");
      return;
    }

    await logAction(verify ? "verify_user" : "unverify_user", "user", userId);
    onDone?.();
  };

  const handleChangeAdminRole = async (userId: string, adminRole: string | null, onDone?: () => void) => {
    const { error } = await supabase
      .from("profiles")
      .update({ admin_role: adminRole })
      .eq("id", userId);

    if (error) {
      alert("Nepodařilo se změnit admin roli.");
      return;
    }

    await logAction("change_admin_role", "user", userId, { new_admin_role: adminRole });
    onDone?.();
  };

  return { logAction, handleVerify, handleChangeAdminRole };
}
