import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  admin_role: "master_admin" | "admin" | "sales";
};

export function useAdminAuth() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, admin_role")
        .eq("id", user.id)
        .single();

      if (profile?.admin_role) {
        setAdmin(profile as AdminProfile);
      }
    }
    loadAdmin();
  }, []);

  return admin;
}
