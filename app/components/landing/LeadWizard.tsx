"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CategoryIcon from "@/app/components/CategoryIcon";
import { fbTrack } from "@/lib/track";

type Cat = { id: string; name: string; icon: string };

/**
 * Embedded poptávka wizard na landing page. Nejdřív poptávka (obor + popis), pak
 * tlačítko „Zadat poptávku":
 *  - PŘIHLÁŠENÝ uživatel → poptávka se odešle rovnou pod jeho účet (žádná registrace).
 *  - NEPŘIHLÁŠENÝ → POVINNÁ registrace v popupu (e-mail + heslo + GDPR), pak vznikne
 *    účet i poptávka. Po úspěchu success zůstává na LP. Konverzní eventy do Meta Pixelu.
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
  const pathname = usePathname();
  const [cats, setCats] = useState<Cat[]>([]);
  const [catsState, setCatsState] = useState<"loading" | "ready" | "error">(hasPre ? "ready" : "loading");
  const [catId, setCatId] = useState<string | null>(preCategoryId ?? null);
  const [catName, setCatName] = useState<string | null>(preCategoryName ?? null);

  // Auth stav — undefined = ještě nevíme (init na serveru i klientu STEJNĚ → žádný hydration
  // mismatch), null = nepřihlášený, string = uid. Doplní se po mountu z onAuthStateChange.
  const [authUid, setAuthUid] = useState<string | null | undefined>(undefined);

  const steps = useMemo(() => (hasPre ? (["detail"] as const) : (["category", "detail"] as const)), [hasPre]);
  const [step, setStep] = useState(0);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [hp, setHp] = useState(""); // honeypot — lidé nevidí, boti vyplní

  const [showReg, setShowReg] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [error, setError] = useState("");
  const [existsEmail, setExistsEmail] = useState(false); // 409 — e-mail už registrovaný
  const [done, setDone] = useState<null | { partial: boolean }>(null);

  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // onAuthStateChange dodá INITIAL_SESSION (obnovená session z cookie) hned po subscribe,
    // plus SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED. Tím spolehlivě zjistíme auth stav klientsky
    // bez getUser/getSession (které umí v některých prohlížečích viset na navigator.locks).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUid(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadCats = () => {
    if (hasPre) return;
    setCatsState("loading");
    supabase
      .from("categories")
      .select("id, name, icon, parent_id, sort_order")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data, error: e }) => {
        if (e || !data) { setCatsState("error"); return; }
        setCats(data as Cat[]);
        setCatsState(data.length > 0 ? "ready" : "error");
      });
  };
  useEffect(() => { loadCats(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hasPre]);

  // Escape zavře popup + obnova fokusu
  useEffect(() => {
    if (!showReg) return;
    lastFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loadingRef.current) setShowReg(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusRef.current?.focus?.();
    };
  }, [showReg]);

  const current = steps[step];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const pickCategory = (c: Cat) => {
    setCatId(c.id);
    setCatName(c.name);
    setTimeout(next, 120);
  };

  // Ref drží vždy aktuální authUid — onClick handler tak nikdy nečte zastaralý closure
  // (obrana proti stale handleru z hydration mismatche).
  const authUidRef = useRef(authUid);
  authUidRef.current = authUid;

  const detailValid = description.trim().length >= 3 && location.trim().length >= 2;
  const regValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 6 && gdpr;

  const setBusy = (v: boolean) => { loadingRef.current = v; setLoading(v); };

  // Titulek bez useknutí uprostřed slova.
  const buildTitle = () => {
    const d = description.trim();
    let t = d.length <= 60 ? d : d.slice(0, 60).replace(/\s+\S*$/, "");
    if (!t) t = d.slice(0, 60);
    return ((catName ? `${catName}: ` : "") + (t || "Poptávka")).slice(0, 200);
  };

  // PŘIHLÁŠENÝ — vlož poptávku rovnou pod jeho účet (RLS auth.uid()=user_id).
  const submitAuthed = async () => {
    const uid = authUidRef.current;
    if (loadingRef.current || !uid) return;
    setBusy(true);
    setError("");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { data, error: e } = await supabase
      .from("requests")
      .insert({
        user_id: uid,
        category_id: catId,
        title: buildTitle(),
        description: description.trim(),
        location: location.trim(),
        status: "active",
        expires_at: expiresAt.toISOString(),
        images: [],
      })
      .select("id")
      .single();
    if (e || !data) {
      // Trigger limitu (denní/promo) nebo RLS → srozumitelná hláška.
      const msg = e?.message || "";
      setError(
        /limit|vyčerpali|týden|denní/i.test(msg)
          ? msg
          : "Poptávku se teď nepodařilo odeslat. Zkuste to prosím za chvíli.",
      );
      setBusy(false);
      return;
    }
    fbTrack("Lead", { content_name: source, content_category: catName || undefined });
    loadingRef.current = false;
    setDone({ partial: false });
  };

  // NEPŘIHLÁŠENÝ — registrace + poptávka přes /api/lead/submit.
  const submitRegister = async () => {
    if (loadingRef.current) return;
    setBusy(true);
    setError("");
    setExistsEmail(false);
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
          hp, // honeypot
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; code?: string; requestCreated?: boolean;
      };
      if (!res.ok || !data.ok) {
        if (data.code === "exists" || res.status === 409) setExistsEmail(true);
        setError(data.error || "Něco se pokazilo. Zkuste to prosím znovu.");
        setBusy(false);
        return;
      }
      // Účet vznikl vždy. Lead (poptávku) trackujeme JEN když reálně vznikla.
      fbTrack("CompleteRegistration", { content_name: source });
      const partial = data.requestCreated === false;
      if (!partial) fbTrack("Lead", { content_name: source, content_category: catName || undefined });
      loadingRef.current = false;
      setShowReg(false);
      setDone({ partial });
    } catch {
      setError("Nepodařilo se odeslat. Zkontrolujte připojení.");
      setBusy(false);
    }
  };

  const onPrimary = () => {
    // typeof string = přihlášený (uid). undefined (auth se ještě nenačetl) i null → registrace.
    if (typeof authUidRef.current === "string") submitAuthed();
    else setShowReg(true);
  };

  // ---- SUCCESS ----
  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-2xl shadow-blue-500/10 ring-1 ring-gray-100" role="status" aria-live="polite">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">🎉</div>
        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
          {done.partial ? "Účet je připravený" : "Hotovo! Poptávka odeslána."}
        </h3>
        <p className="mt-2 text-gray-600">
          {done.partial
            ? "Vytvořili jsme vám účet. Poptávku teď prosím dokončete ve svém účtu — uložíme vám ji tam."
            : authUid
              ? "Ověření fachmani už dostávají vaši poptávku. Nabídky uvidíte ve svém účtu i na e-mailu."
              : "Vytvořili jsme vám účet a ověření fachmani už dostávají vaši poptávku. Nabídky vám pošleme na e-mail."}
        </p>
        <Link
          href={done.partial ? "/nova-poptavka" : "/dashboard"}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
        >
          {done.partial ? "Dokončit poptávku →" : "Přejít do účtu →"}
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
              {catsState === "loading" && (
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-gray-100" />
                  ))}
                </div>
              )}
              {catsState === "error" && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  Nepodařilo se načíst obory.{" "}
                  <button type="button" onClick={loadCats} className="font-semibold underline">Zkusit znovu</button>
                  {" "}nebo{" "}
                  <Link href="/nova-poptavka" className="font-semibold underline">zadejte poptávku tady</Link>.
                </div>
              )}
              {catsState === "ready" && (
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
              )}
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
              {/* chyba u přihlášeného (přímé odeslání) */}
              {authUid && error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
              <div className="mt-5 flex items-center justify-between gap-3">
                {!hasPre ? (
                  <button type="button" onClick={back} className="text-sm font-semibold text-gray-400 hover:text-gray-600">← Zpět</button>
                ) : <span />}
                <div className="flex flex-col items-end">
                  <button
                    type="button"
                    disabled={!detailValid || loading}
                    onClick={onPrimary}
                    className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {loading && typeof authUid === "string" ? "Odesílám…" : "Zadat poptávku →"}
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

      {/* POPUP REGISTRACE — jen pro nepřihlášené */}
      {showReg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => !loading && setShowReg(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lw-reg-title"
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl lw-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-700">Poslední krok</span>
              <button type="button" onClick={() => !loading && setShowReg(false)} className="text-gray-300 hover:text-gray-500" aria-label="Zavřít">✕</button>
            </div>
            <h3 id="lw-reg-title" className="mt-2 text-xl font-extrabold text-slate-900">Vytvořte si účet zdarma</h3>
            <p className="mt-1 text-sm text-gray-500">Ať máte nabídky přehledně na jednom místě. Zabere to 20 sekund.</p>

            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setExistsEmail(false); }}
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
            {/* honeypot — skrytý, jen pro boty */}
            <input
              type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={hp} onChange={(e) => setHp(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website"
            />
            <label className="mt-3 flex items-start gap-2.5 text-xs text-gray-500">
              <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-400" />
              <span>
                Souhlasím se zpracováním údajů za účelem zprostředkování poptávky a{" "}
                <Link href="/vop" target="_blank" className="text-cyan-600 underline">podmínkami</Link> dle{" "}
                <Link href="/gdpr" target="_blank" className="text-cyan-600 underline">zásad ochrany údajů</Link>.
              </span>
            </label>

            {error && (
              <p className="mt-3 text-sm text-red-500" role="alert" aria-live="assertive">
                {error}
                {existsEmail && (
                  <>
                    {" "}
                    <Link href={`/auth/login?redirect=${encodeURIComponent(pathname || "/")}`} className="font-semibold underline">Přihlásit se →</Link>
                  </>
                )}
              </p>
            )}

            <button
              type="button"
              disabled={!regValid || loading}
              onClick={submitRegister}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {loading ? "Odesílám…" : "Vytvořit účet a odeslat poptávku 🚀"}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Už máte účet?{" "}
              <Link href={`/auth/login?redirect=${encodeURIComponent(pathname || "/")}`} className="font-semibold text-cyan-600 hover:underline">Přihlaste se</Link>
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
