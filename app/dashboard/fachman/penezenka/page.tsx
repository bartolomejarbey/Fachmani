"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Wallet = {
  id: string;
  balance_kc: number;
  total_topped_up_kc: number;
  total_spent_kc: number;
};

type WalletTransaction = {
  id: string;
  type: string;
  amount_kc: number;
  balance_after_kc: number;
  description: string;
  created_at: string;
};

type PremiumSub = {
  id: string;
  status: string;
  next_billing_at: string | null;
  started_at: string;
  cancelled_at: string | null;
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const TX_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  topup: { label: "Dobiti", icon: "💰" },
  offer_publish: { label: "Nabidka", icon: "📨" },
  profile_boost_7d: { label: "Topovani", icon: "🚀" },
  feed_boost_1d: { label: "Boost", icon: "📣" },
};

export default function PenezenkaPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [premium, setPremium] = useState<PremiumSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [premiumProcessing, setPremiumProcessing] = useState(false);
  const [txFilter, setTxFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const [walletRes, txRes, premiumRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("premium_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    ]);

    setWallet(walletRes.data);
    setTransactions(txRes.data || []);
    setPremium(premiumRes.data);
    setLoading(false);
  };

  const handleTopup = async () => {
    const amount = isCustom ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount < 100 || amount > 50000) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/payments/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKc: amount }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Chyba pri vytvareni platby");
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch {
      alert("Chyba pripojeni");
    } finally {
      setProcessing(false);
    }
  };

  const handlePremium = async () => {
    setPremiumProcessing(true);
    try {
      const response = await fetch("/api/payments/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Chyba");
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch {
      alert("Chyba pripojeni");
    } finally {
      setPremiumProcessing(false);
    }
  };

  const filteredTransactions = txFilter === "all"
    ? transactions
    : transactions.filter(t => t.type === txFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Penezenka</h1>
            <p className="text-gray-600">Spravuj sve kredity a predplatne</p>
          </div>
          <Link
            href="/dashboard/fachman"
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            &larr; Dashboard
          </Link>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-white mb-8 shadow-xl">
          <p className="text-cyan-100 text-sm font-medium mb-1">Aktualni zustatek</p>
          <p className="text-5xl font-bold mb-4">
            {wallet?.balance_kc?.toLocaleString() || 0} Kc
          </p>
          <div className="flex gap-6 text-sm text-cyan-100">
            <div>
              <span className="block text-cyan-200 text-xs">Celkem nabito</span>
              {wallet?.total_topped_up_kc?.toLocaleString() || 0} Kc
            </div>
            <div>
              <span className="block text-cyan-200 text-xs">Celkem utraceno</span>
              {wallet?.total_spent_kc?.toLocaleString() || 0} Kc
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Topup Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nabit kredity</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {QUICK_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => { setSelectedAmount(amount); setIsCustom(false); }}
                  className={`py-3 rounded-xl font-bold text-lg transition-all ${
                    !isCustom && selectedAmount === amount
                      ? "bg-cyan-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {amount.toLocaleString()} Kc
                </button>
              ))}
            </div>

            <div className="mb-4">
              <button
                onClick={() => setIsCustom(!isCustom)}
                className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                  isCustom
                    ? "bg-cyan-50 text-cyan-700 border-2 border-cyan-300"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Jina castka
              </button>
              {isCustom && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="100 - 50000"
                    min={100}
                    max={50000}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <span className="text-gray-500 font-medium">Kc</span>
                </div>
              )}
            </div>

            <button
              onClick={handleTopup}
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {processing ? "Zpracovavam..." : `Nabit ${isCustom ? (customAmount || "0") : selectedAmount.toLocaleString()} Kc`}
            </button>

            <p className="text-xs text-gray-400 mt-2 text-center">
              Platba pres ComGate (kartou, bankovnim prevodem)
            </p>
          </div>

          {/* Premium Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Premium predplatne</h2>

            {premium ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⭐</span>
                    <span className="font-bold text-amber-800">Premium aktivni</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Aktivni od {new Date(premium.started_at).toLocaleDateString("cs-CZ")}
                  </p>
                  {premium.next_billing_at && (
                    <p className="text-sm text-amber-700">
                      Dalsi platba: {new Date(premium.next_billing_at).toLocaleDateString("cs-CZ")}
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">Vyhody Premium:</p>
                  <ul className="space-y-1">
                    <li>- Neomezene nabidky na poptavky</li>
                    <li>- Prioritni zobrazeni v katalogu</li>
                    <li>- Premium badge na profilu</li>
                    <li>- Pristup k exkluzivnim poptavkam</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-3xl font-bold text-gray-900 mb-1">499 Kc<span className="text-lg font-normal text-gray-500">/mesic</span></p>
                  <p className="text-sm text-gray-600">Mesicni predplatne s automatickou obnovou</p>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">Co ziskas:</p>
                  <ul className="space-y-1">
                    <li>- Neomezene nabidky na poptavky</li>
                    <li>- Prioritni zobrazeni v katalogu</li>
                    <li>- Premium badge na profilu</li>
                    <li>- Pristup k exkluzivnim poptavkam</li>
                  </ul>
                </div>

                <button
                  onClick={handlePremium}
                  disabled={premiumProcessing}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {premiumProcessing ? "Zpracovavam..." : "Aktivovat Premium 499 Kc/mesic"}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Predplatne se automaticky obnovuje. Zrusit lze kdykoliv.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cenik akci</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="text-2xl">📨</span>
              <p className="font-bold text-gray-900 mt-1">29 Kc</p>
              <p className="text-sm text-gray-600">Odeslani nabidky</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="text-2xl">🚀</span>
              <p className="font-bold text-gray-900 mt-1">99 Kc</p>
              <p className="text-sm text-gray-600">Topovani profilu (7 dni)</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="text-2xl">📣</span>
              <p className="font-bold text-gray-900 mt-1">49 Kc</p>
              <p className="text-sm text-gray-600">Boost na feedu (1 den)</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Historie transakci</h2>
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Vse</option>
              <option value="topup">Dobiti</option>
              <option value="offer_publish">Nabidky</option>
              <option value="profile_boost_7d">Topovani</option>
              <option value="feed_boost_1d">Boost</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-500">Zadne transakce</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map(tx => {
                const info = TX_TYPE_LABELS[tx.type] || { label: tx.type, icon: "💱" };
                const isPositive = tx.amount_kc > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-xl">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{tx.description || info.label}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleString("cs-CZ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}{tx.amount_kc} Kc
                      </p>
                      <p className="text-xs text-gray-400">
                        Zustatek: {tx.balance_after_kc} Kc
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
