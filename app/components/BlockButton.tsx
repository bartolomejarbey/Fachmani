"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Tlačítko „Blokovat / Odblokovat" uživatele (App Store 1.2).
 * Zapisuje do `blocked_users` (RLS: blocker_id = auth.uid()).
 * Zablokovaný uživatel ti nemůže poslat zprávu (DB trigger) a jeho obsah skrýváš.
 */
export default function BlockButton({
  targetUserId,
  targetName,
  className = "",
  onChange,
}: {
  targetUserId: string;
  targetName?: string | null;
  className?: string;
  onChange?: (blocked: boolean) => void;
}) {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setMe(null);
        setBlocked(false);
        return;
      }
      setMe(user.id);
      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();
      if (active) setBlocked(!!data);
    })();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  // Nezobrazovat tlačítko sám na sebe ani pro nepřihlášené.
  if (blocked === null || !me || me === targetUserId) return null;

  const toggle = async () => {
    if (busy) return;
    if (!blocked) {
      const ok = window.confirm(
        `Opravdu chceš zablokovat ${targetName || "tohoto uživatele"}? Už ti nebude moct psát zprávy a neuvidíš jeho obsah.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    if (blocked) {
      const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", me).eq("blocked_id", targetUserId);
      if (error) { alert("Odblokování se nezdařilo. Zkus to prosím znovu."); setBusy(false); return; }
      setBlocked(false);
      onChange?.(false);
    } else {
      const { error } = await supabase.from("blocked_users").insert({ blocker_id: me, blocked_id: targetUserId });
      // 23505 = už zablokováno → ber jako úspěch (idempotentní)
      if (error && error.code !== "23505") { alert("Blokování se nezdařilo. Zkus to prosím znovu."); setBusy(false); return; }
      setBlocked(true);
      onChange?.(true);
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`text-xs font-semibold transition-colors disabled:opacity-50 ${
        blocked ? "text-gray-500 hover:text-gray-700" : "text-red-500 hover:text-red-600"
      } ${className}`}
      title={blocked ? "Odblokovat uživatele" : "Zablokovat uživatele"}
    >
      {busy ? "…" : blocked ? "🔓 Odblokovat" : "🚫 Blokovat"}
    </button>
  );
}
