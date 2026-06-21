"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CategoryIcon from "@/app/components/CategoryIcon";

type Cat = { id: string; name: string; icon: string };

/**
 * Embedded poptávka wizard na landing page. Slide po slidu (jedna věc naráz).
 * Primární cesta = mega-jednoduchá registrace (e-mail + heslo) → rovnou vytvoří účet
 * i poptávku. Skrytá možnost „bez účtu" (e-mail + telefon) je tucked pod hlavním CTA.
 * GDPR: explicitní souhlas, odkaz na podmínky, ukládá se přes /api/lead/submit.
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

  const steps = useMemo(() => (hasPre ? (["detail", "contact"] as const) : (["category", "detail", "contact"] as const)), [hasPre]);
  const [step, setStep] = useState(0);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [noAccount, setNoAccount] = useState(false); // skrytá cesta bez registrace

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "register" | "lead">(null);

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
  const progress = Math.round(((step + (done ? 1 : 0)) / steps.length) * 100);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const pickCategory = (c: Cat) => {
    setCatId(c.id);
    setCatName(c.name);
    setTimeout(next, 120);
  };

  const detailValid = description.trim().length >= 5 && location.trim().length >= 2;
  const contactValid = noAccount
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && gdpr
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6 && gdpr;

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: noAccount ? "lead" : "register",
          email: email.trim(),
          password: noAccount ? undefined : password,
          phone: phone.trim() || undefined,
          categoryId: catId,
          categoryName: catName,
          description: description.trim(),
          location: location.trim(),
          source,
          gdpr,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; mode?: string; error?: string; code?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Něco se pokazilo. Zkuste to prosím znovu.");
        setLoading(false);
        return;
      }
      setDone(noAccount ? "lead" : "register");
    } catch {
      setError("Nepodařilo se odeslat. Zkontrolujte připojení.");
      setLoading(false);
    }
  };

  // ---- SUCCESS ----
  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-2xl shadow-blue-500/10 ring-1 ring-gray-100">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">🎉</div>
        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">Hotovo! Poptávka odeslána.</h3>
        <p className="mt-2 text-gray-600">
          {done === "register"
            ? "Vytvořili jsme vám účet a ověření fachmani už dostávají vaši poptávku. Nabídky vám pošleme na e-mail."
            : "Vaši poptávku máme. Ozveme se vám na e-mail s nabídkami od ověřených fachmanů."}
        </p>
        {done === "register" && (
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            Přejít do účtu →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-blue-500/10 ring-1 ring-gray-100">
      {/* progress */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300" style={{ width: `${Math.max(progress, 8)}%` }} />
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
            <div className="mt-5 flex items-center justify-between">
              {!hasPre ? (
                <button type="button" onClick={back} className="text-sm font-semibold text-gray-400 hover:text-gray-600">← Zpět</button>
              ) : <span />}
              <button
                type="button"
                disabled={!detailValid}
                onClick={next}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Pokračovat →
              </button>
            </div>
          </div>
        )}

        {/* STEP: contact (registrace primárně) */}
        {current === "contact" && (
          <div className="lw-slide">
            <h3 className="text-xl font-extrabold text-slate-900">Kam poslat nabídky?</h3>
            <p className="mt-1 text-sm text-gray-500">
              {noAccount ? "Pošleme vám nabídky na e-mail." : "Založíme vám účet, ať máte nabídky přehledně na jednom místě."}
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="vas@email.cz"
              className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
            />

            {!noAccount ? (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zvolte heslo (min. 6 znaků)"
                className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
              />
            ) : (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefon (nepovinné)"
                className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-cyan-500"
              />
            )}

            <label className="mt-3 flex items-start gap-2.5 text-xs text-gray-500">
              <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-400" />
              <span>
                Souhlasím se zpracováním údajů za účelem zprostředkování poptávky dle{" "}
                <Link href="/gdpr" target="_blank" className="text-cyan-600 underline">zásad ochrany údajů</Link> a{" "}
                <Link href="/vop" target="_blank" className="text-cyan-600 underline">podmínek</Link>.
              </span>
            </label>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={back} className="text-sm font-semibold text-gray-400 hover:text-gray-600">← Zpět</button>
              <button
                type="button"
                disabled={!contactValid || loading}
                onClick={submit}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {loading ? "Odesílám…" : noAccount ? "Odeslat poptávku" : "Vytvořit účet a odeslat 🚀"}
              </button>
            </div>

            {/* skrytá možnost bez registrace */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setNoAccount((v) => !v); setError(""); }}
                className="text-[11px] text-gray-300 underline transition-colors hover:text-gray-500"
              >
                {noAccount ? "← Chci si raději založit účet" : "Nechci účet, jen mi pošlete nabídky"}
              </button>
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
  );
}
