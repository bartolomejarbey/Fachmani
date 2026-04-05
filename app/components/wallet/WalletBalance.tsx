"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function WalletBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [walletRes, premiumRes] = await Promise.all([
        supabase.from("wallets").select("balance_kc").eq("user_id", user.id).maybeSingle(),
        supabase.from("premium_subscriptions").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);

      if (walletRes.data) setBalance(walletRes.data.balance_kc);
      if (premiumRes.data) setHasPremium(true);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || balance === null) return null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard/fachman/penezenka"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold text-gray-700"
      >
        <span>💰</span>
        <span>{balance.toLocaleString()} Kc</span>
      </Link>
      {!hasPremium && (
        <Link
          href="/dashboard/fachman/penezenka"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all text-xs font-semibold text-amber-700"
        >
          <span>⭐</span>
          <span>Premium</span>
        </Link>
      )}
    </div>
  );
}
