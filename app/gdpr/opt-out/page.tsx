"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function GdprOptOutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <GdprOptOutContent />
    </Suspense>
  );
}

function GdprOptOutContent() {
  const searchParams = useSearchParams();
  const [ico, setIco] = useState("");

  useEffect(() => {
    const prefill = searchParams?.get("ico");
    if (prefill && /^[0-9]{8}$/.test(prefill)) setIco(prefill);
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ghost/gdpr-opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ico: ico.trim(), email: email.trim(), reason: reason.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(json.error || `Chyba (${res.status})`);
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Žádost o vyřazení z ARES listingu</h1>
          <p className="text-gray-600 mb-8">
            Pokud jste podnikatel uvedený jako neclaimnutý profil v naší databázi a přejete si,
            aby Fachmani.org tento profil již nezobrazoval, vyplňte níže IČO a kontaktní email.
            Žádost zpracováváme dle GDPR čl. 21 (právo vznést námitku).
          </p>

          {done ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-2">Žádost přijata</h2>
              <p className="text-green-800 text-sm">
                Profil pro IČO <strong>{ico}</strong> jsme z veřejné části Fachmani odstranili.
                Z indexů vyhledávačů zmizí v rámci dalšího crawlu (typicky 1–4 týdny).
              </p>
              <Link href="/" className="inline-block mt-4 text-green-700 hover:underline">
                ← Zpět na úvod
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IČO *</label>
                <input
                  type="text"
                  value={ico}
                  onChange={(e) => setIco(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  required
                  placeholder="12345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">8 číslic, bez mezer.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktní email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vas@email.cz"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pro případ, že bychom potřebovali ověřit identitu (vyhrazujeme si právo poslat
                  ověřovací mail před definitivním smazáním).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Důvod (volitelný)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Např. již nepodnikám, zdroj dat (ARES) je dle mne nesprávný apod."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{reason.length}/500</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !ico || !email}
                className="w-full bg-cyan-600 text-white font-semibold py-3 rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? "Odesílám…" : "Odeslat žádost"}
              </button>

              <p className="text-xs text-gray-500">
                Odesláním žádosti potvrzujete, že máte oprávnění jednat za daný subjekt. Falešné
                žádosti mohou být postoupeny k řešení dle § 184 trestního zákoníku.
              </p>
            </form>
          )}

          <div className="mt-8 text-sm text-gray-600">
            Více o tom, jak Fachmani pracuje s daty z ARES, najdete v sekci{" "}
            <Link href="/gdpr" className="text-cyan-700 hover:underline">
              Ochrana osobních údajů
            </Link>
            .
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
