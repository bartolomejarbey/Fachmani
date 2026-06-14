"use client";

import ConfettiBurst from "./ConfettiBurst";

/**
 * Oslavná obrazovka po odeslání poptávky: konfety + expanding rings + kreslený
 * checkmark + „Poptávka zadána! 🎉". A11y přes aria-live; konfety respektují
 * prefers-reduced-motion (ConfettiBurst). Prezentační — routing řeší rodič.
 */
export default function SuccessCelebration({
  title = "Poptávka zadána! 🎉",
  subtitle = "Ověření fachmani už dostávají upozornění. Přesměrováváme na detail…",
  ctaLabel = "Zobrazit poptávku →",
  onCta,
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 px-4 backdrop-blur-md sc-fade-in"
    >
      <ConfettiBurst fire />
      <div className="relative z-[2] w-full max-w-sm rounded-3xl border border-gray-100 bg-white px-8 py-12 text-center shadow-2xl sc-pop-in">
        {/* expanding rings */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-12 h-20 w-20 -translate-x-1/2 rounded-full border-2 border-cyan-400/70 sc-ring" />
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-12 h-20 w-20 -translate-x-1/2 rounded-full border-2 border-blue-400/60 sc-ring" style={{ animationDelay: "0.4s" }} />

        {/* kreslený checkmark */}
        <svg viewBox="0 0 52 52" className="relative mx-auto mb-5 h-20 w-20" aria-hidden>
          <circle cx="26" cy="26" r="24" fill="none" stroke="#06b6d4" strokeWidth="3"
            strokeDasharray="166" strokeDashoffset="166" className="sc-dash-circle" />
          <path fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            d="M14 27l8 8 16-16" strokeDasharray="48" strokeDashoffset="48" className="sc-dash-check" />
        </svg>

        <h2 className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-2xl font-extrabold text-transparent">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>

        <button
          type="button"
          onClick={onCta}
          autoFocus
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          {ctaLabel}
        </button>
      </div>

      <style>{`
        @keyframes scFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .sc-fade-in { animation: scFadeIn .25s ease-out both }
        @keyframes scPopIn {
          0% { opacity: 0; transform: translateY(16px) scale(.92) }
          60% { transform: translateY(0) scale(1.03) }
          100% { opacity: 1; transform: translateY(0) scale(1) }
        }
        .sc-pop-in { animation: scPopIn .5s cubic-bezier(.34,1.56,.64,1) both }
        @keyframes scRing {
          0% { opacity: .7; transform: translateX(-50%) scale(.5) }
          100% { opacity: 0; transform: translateX(-50%) scale(2.4) }
        }
        .sc-ring { animation: scRing 1.4s ease-out infinite }
        @keyframes scDashCircle { to { stroke-dashoffset: 0 } }
        .sc-dash-circle { animation: scDashCircle .6s ease-out .15s forwards }
        @keyframes scDashCheck { to { stroke-dashoffset: 0 } }
        .sc-dash-check { animation: scDashCheck .4s ease-out .6s forwards }
        @media (prefers-reduced-motion: reduce) {
          .sc-fade-in, .sc-pop-in, .sc-ring { animation: none }
          .sc-dash-circle, .sc-dash-check { stroke-dashoffset: 0; animation: none }
          .sc-pop-in { opacity: 1 }
        }
      `}</style>
    </div>
  );
}
