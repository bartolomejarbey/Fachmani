"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function TestGatewayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refId = searchParams.get("refId") || "";
  const amount = searchParams.get("amount") || "0";
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const simulate = async (status: "PAID" | "CANCELLED") => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("transId", `TEST-SIM-${Date.now()}`);
      formData.append("status", status);
      formData.append("refId", refId);

      await fetch("/api/payments/webhook", {
        method: "POST",
        body: formData,
      });

      setResult(status);

      setTimeout(() => {
        if (status === "PAID") {
          router.push("/payment/success");
        } else {
          router.push("/payment/fail");
        }
      }, 1500);
    } catch {
      setResult("ERROR");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-3xl p-8 max-w-lg w-full border border-slate-700">
        <div className="text-center mb-8">
          <div className="inline-block bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            TEST MODE
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ComGate Test Gateway</h1>
          <p className="text-slate-400">
            Simulace platebni brany pro testovani
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Castka:</span>
            <span className="text-white font-bold">{parseInt(amount).toLocaleString()} Kc</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Ref ID:</span>
            <span className="text-slate-300 font-mono text-xs truncate ml-4">{refId}</span>
          </div>
        </div>

        {result ? (
          <div className={`text-center py-6 rounded-xl ${
            result === "PAID" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>
            <span className="text-3xl block mb-2">{result === "PAID" ? "✅" : "❌"}</span>
            <p className="font-bold">{result === "PAID" ? "Platba uspesna" : "Platba zrusena"}</p>
            <p className="text-sm opacity-75 mt-1">Presmerovavam...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => simulate("PAID")}
              disabled={processing}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50"
            >
              Simulovat uspech
            </button>
            <button
              onClick={() => simulate("CANCELLED")}
              disabled={processing}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50"
            >
              Simulovat selhani
            </button>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-6 text-center">
          Tato stranka se zobrazi pouze v test mode (COMGATE_TEST_MODE=true).
          V produkci bude uzivatel presmerovan na skutecnou platebni branu ComGate.
        </p>
      </div>
    </div>
  );
}

export default function TestGatewayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TestGatewayContent />
    </Suspense>
  );
}
