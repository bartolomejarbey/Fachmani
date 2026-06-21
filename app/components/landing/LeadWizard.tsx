"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CategoryIcon from "@/app/components/CategoryIcon";
import { fbTrack } from "@/lib/track";

type Cat = { id: string; name: string; icon: string };

/**
 * Embedded poptávka wizard na landing page. Nejdřív poptávka (obor + popis), pak
 * tlačítko „Zadat poptávku" vyvolá POVINNOU registraci v popupu. Po dokončení
 * registrace se rovnou vytvoří účet i poptávka a uživatel zůstává na landing page
 * s potvrzením. Konverzní eventy (Lead + CompleteRegistration) do Meta Pixelu.
 */
export default function LeadWizard({
  source,
  preCategoryId,
  preCategoryName,
}: {
  source: string;
  preCategoryId?: string;
  preCategoryName?: string;
}) {
  const hasPre = !!preCategoryId && !!preCategoryName;
  const [cats, setCats] = useState<Cat[]>([]);
  const [catId, setCatId] = useState<string | null>(preCategoryId ?? null);
  const [catName, setCatName] = useState<string | null>(preCategoryName ?? null);

  const steps = useMemo(() => (hasPre ? (["detail"] as const) : (["category", "detail"] as const)), [hasPre]);
  const [step, setStep] = useState(0);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gdpr, setGdpr] = useState(false);

  const [showReg, setShowReg] = useState(false); // popup registrace
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hasPre) return;
    supabase
      .from("categories")
      .select("id, name, icon, parent_id, sort_order")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) setCats(data as Cat[]);
      });
  }, [hasPre]);

  const current = steps[step];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const pickCategory = (c: Cat) => {
    setCatId(c.id);
    setCatName(c.name);
    setTimeout(next, 120);
  };

  const detailValid = description.trim().length >= 3 && location.trim().length >= 2;
  const regValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6 && gdpr;

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "register",
          email: email.trim(),
          password,
          categoryId: catId,
          categoryName: catName,
          description: description.trim(),
          location: location.trim(),
          source,
          gdpr,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Něco se pokazilo. Zkuste to prosím znovu.");
        setLoading(false);
        return;
      }
      // Konverzní eventy do Meta Pixelu
      fbTrack("CompleteRegistration", { content_name: source });
      fbTrack("Lead", { content_name: source, content_category: catName || undefined });
      setShowReg(false);
      setDone(true);
    } catch {
      setError("Nepodařilo se odeslat. Zkontrolujte připojení.");
      setLoading(false);
    }
  };

  // ---- SUCCESS (zůstává na landing page) ----
  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-2xl shadow-blue-500/10 ring-1 ring-gray-100">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">🎉</div>
        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">Hotovo! Poptávka odeslána.</h3>
        <p className="mt-2 text-gray-600">
          Vytvořili jsme vám účet a ověření fachmani už dostávají vaši poptávku. Nabídky vám pošleme na e-mail.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
        >
          Přejít do účtu →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-blue-500/10 ring-1 ring-gray-100">
        {/* progress */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300" style={{ width: `${Math.max(((step + 1) / steps.length) * 100, 12)}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-gray-400">
            {String(step + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {/* STEP: category */}
          {current === "category" && (
            <div className="lw-slide">
              <h3 className="text-xl font-extrabold text-slate-900">Co potřebujete?</h3>
              <p className="mt-1 text-sm text-gray-500">Vyberte obor — ozve se vám ten správný fachman.</p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCategory(c)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all ${
                      catId === c.id ? "border-transparent bg-gradient-to-br from-cyan-500 to-blue-600 text-white" : "border-gray-100 bg-white text-gray-700 hover:border-cyan-200 hover:bg-cyan-50/60"
                    }`}
                  >
                    <CategoryIcon icon={c.icon} className="text-2xl leading-none" />
                    <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: detail */}
          {current === "detail" && (
            <div className="lw-slide">
              <h3 className="text-xl font-extrabold text-slate-900">Popište zakázku</h3>
              <p className="mt-1 text-sm text-gray-500">Stačí pár vět — čím konkrétnější, tím lepší nabídky.</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                autoFocus
                placeholder={catName ? `Např. ${catName.toLowerCase()} — co přesně potřebujete?` : "Co potřebujete udělat?"}
                className="mt-4 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Město / obec (např. Praha)"
                className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
              />
              <div className="mt-5 flex items-center justify-between gap-3">
                {!hasPre ? (
                  <button type="button" onClick={back} className="text-sm font-semibold text-gray-400 hover:text-gray-600">← Zpět</button>
                ) : <span />}
                <div className="flex flex-col items-end">
                  <button
                    type="button"
                    disabled={!detailValid}
                    onClick={() => setShowReg(true)}
                    className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    Zadat poptávku →
                  </button>
                  {!detailValid && (
                    <span className="mt-1.5 text-[11px] text-gray-400">
                      {description.trim().length < 3 ? "Doplňte krátký popis" : "Doplňte město / obec"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes lwSlide { from { opacity: 0; transform: translateX(14px) } to { opacity: 1; transform: none } }
          .lw-slide { animation: lwSlide .28s ease-out both }
          @media (prefers-reduced-motion: reduce) { .lw-slide { animation: none } }
        `}</style>
      </div>

      {/* POPUP REGISTRACE — povinná, vyskočí po „Zadat poptávku" */}
      {showReg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => !loading && setShowReg(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl lw-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-700">Poslední krok</span>
              <button type="button" onClick={() => !loading && setShowReg(false)} className="text-gray-300 hover:text-gray-500" aria-label="Zavřít">✕</button>
            </div>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">Vytvořte si účet zdarma</h3>
            <p className="mt-1 text-sm text-gray-500">Ať máte nabídky přehledně na jednom místě. Zabere to 20 sekund.</p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="vas@email.cz"
              className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Zvolte heslo (min. 6 znaků)"
              className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
            />
            <label className="mt-3 flex items-start gap-2.5 text-xs text-gray-500">
              <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-400" />
              <span>
                Souhlasím se zpracováním údajů a{" "}
                <Link href="/vop" target="_blank" className="text-cyan-600 underline">podmínkami</Link> dle{" "}
                <Link href="/gdpr" target="_blank" className="text-cyan-600 underline">zásad ochrany údajů</Link>.
              </span>
            </label>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button
              type="button"
              disabled={!regValid || loading}
              onClick={submit}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {loading ? "Odesílám…" : "Vytvořit účet a odeslat poptávku 🚀"}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Už máte účet?{" "}
              <Link href="/auth/login" className="font-semibold text-cyan-600 hover:underline">Přihlaste se</Link>
            </p>
          </div>
          <style>{`
            @keyframes lwPop { from { opacity: 0; transform: translateY(16px) scale(.96) } to { opacity: 1; transform: none } }
            .lw-pop { animation: lwPop .28s cubic-bezier(.34,1.56,.64,1) both }
            @media (prefers-reduced-motion: reduce) { .lw-pop { animation: none } }
          `}</style>
        </div>
      )}
    </>
  );
}
