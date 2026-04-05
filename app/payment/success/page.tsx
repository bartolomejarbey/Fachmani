"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Platba uspesna!</h1>
        <p className="text-gray-600 mb-6">
          {type === "premium"
            ? "Premium predplatne bylo aktivovano. Uzivej vyhody Premium uctu!"
            : "Penezenka byla uspesne nabita. Kredity jsou k dispozici."}
        </p>
        <div className="space-y-3">
          <Link
            href="/dashboard/fachman/penezenka"
            className="block w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Zpet do penezenky
          </Link>
          <Link
            href="/dashboard/fachman"
            className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
