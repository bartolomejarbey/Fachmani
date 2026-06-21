import Link from "next/link";
import type { ReactNode } from "react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export type WatchPoint = { icon: string; title: string; desc: string };

export type LandingConfig = {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  heroEmoji: string;
  /** Volitelná druhá ilustrace v hero kartě (emoji). */
  heroEmojiAlt?: string;
  watchHeading: string;
  watchIntro: string;
  watchPoints: WatchPoint[];
};

const STEPS = [
  { n: "1", title: "Zadáte poptávku", desc: "Popíšete, co potřebujete. Zabere to dvě minuty a je to zdarma." },
  { n: "2", title: "Ozvou se fachmani", desc: "Ověření profíci vám pošlou nabídky — reakce do 7 dnů, expresně do 2." },
  { n: "3", title: "Vyberete si", desc: "Porovnáte profily, hodnocení a ceny. Domluvíte se napřímo." },
];

const TRUST = [
  { icon: "✅", label: "Ověření profíci", desc: "Identita i reference prověřené" },
  { icon: "⚡", label: "Rychlá reakce", desc: "Nabídky do 7 dnů, expres do 2" },
  { icon: "🎁", label: "100 % zdarma", desc: "Zadání poptávky nic nestojí" },
  { icon: "🛡️", label: "Bez závazků", desc: "Vyberete si, jen když chcete" },
];

export default function CampaignLanding({ config }: { config: LandingConfig }) {
  const cta = (extra?: string) => (
    <Link
      href={config.ctaHref}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl ${extra || ""}`}
    >
      {config.ctaLabel} <span aria-hidden>→</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cyan-50/60 to-white pt-28 pb-16 sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-16 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-400/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
              {config.eyebrow}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#0f1e3d] sm:text-5xl">
              {config.titleLead}{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                {config.titleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-gray-600">{config.subtitle}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {cta()}
              <Link href="/jak-to-funguje" className="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                Jak to funguje?
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5">✅ Ověření profíci</span>
              <span className="flex items-center gap-1.5">⚡ Reakce do 7 dnů</span>
              <span className="flex items-center gap-1.5">🎁 100 % zdarma</span>
            </div>
          </div>

          {/* Hero vizuál */}
          <div className="relative">
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-700 p-8 text-white shadow-2xl shadow-blue-500/30">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "18px 18px" }}
              />
              <div className="relative flex flex-col items-center gap-5 py-4 text-center">
                <div className="flex items-center gap-3 text-6xl">
                  <span>{config.heroEmoji}</span>
                  {config.heroEmojiAlt && <span className="opacity-90">{config.heroEmojiAlt}</span>}
                </div>
                <p className="text-xl font-bold leading-snug">
                  Rozhoduje hlavně to,
                  <br />
                  co nevidíte.
                </p>
                <p className="text-sm text-white/80">
                  Skrytá práce určuje kvalitu i bezpečnost. S ověřeným fachmanem ji nemusíte hlídat sami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NA CO SI DÁT POZOR — substance kampaně */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-[#0f1e3d] sm:text-4xl">{config.watchHeading}</h2>
            <p className="mt-3 text-gray-600">{config.watchIntro}</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {config.watchPoints.map((p) => (
              <div
                key={p.title}
                className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-2xl transition-colors group-hover:bg-cyan-100">
                  {p.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#0f1e3d]">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JAK TO FUNGUJE */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-[#0f1e3d] sm:text-4xl">Jak to funguje</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-3xl bg-white p-6 shadow-sm">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-bold text-white shadow-md">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#0f1e3d]">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">{cta()}</div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.label} className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <div className="text-3xl">{t.icon}</div>
                <p className="mt-2 font-bold text-[#0f1e3d]">{t.label}</p>
                <p className="mt-1 text-sm text-gray-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINÁLNÍ CTA */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-700 px-6 py-14 text-center text-white shadow-2xl shadow-blue-500/30 sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "20px 20px" }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              🎉 Teď 100 % zdarma
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              Zadejte jednu poptávku.
              <br />
              Fachmani se vám ozvou sami.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Reakci získáte do 7 dnů, expresně do 2. Bez závazků — vyberete si, jen když budete chtít.
            </p>
            <div className="mt-7">
              <Link
                href={config.ctaHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {config.ctaLabel} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
