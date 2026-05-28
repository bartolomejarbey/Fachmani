"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getConsent,
  setConsent,
  DEFAULT_CATEGORIES,
  OPEN_SETTINGS_EVENT,
  type ConsentCategories,
} from "@/lib/cookieConsent";

type Cat = "analytics" | "marketing";

const CATEGORY_INFO: {
  key: Cat;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  {
    key: "analytics",
    emoji: "📊",
    title: "Analytické",
    desc: "Anonymní statistiky návštěvnosti — pomáhají nám zlepšovat web. Bez nich nevíme, co funguje.",
  },
  {
    key: "marketing",
    emoji: "🎯",
    title: "Marketingové",
    desc: "Měření účinnosti kampaní a relevantnější obsah. Nikdy neprodáváme vaše data třetím stranám.",
  },
];

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<Omit<ConsentCategories, "necessary">>({
    analytics: DEFAULT_CATEGORIES.analytics,
    marketing: DEFAULT_CATEGORIES.marketing,
  });

  // Při prvním renderu: zobraz, jen pokud chybí platný souhlas.
  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      setOpen(true);
    } else {
      setPrefs({
        analytics: existing.categories.analytics,
        marketing: existing.categories.marketing,
      });
    }
  }, []);

  // Reotevření z footeru / stránky /cookies.
  useEffect(() => {
    const reopen = () => {
      const existing = getConsent();
      if (existing) {
        setPrefs({
          analytics: existing.categories.analytics,
          marketing: existing.categories.marketing,
        });
      }
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setShowDetails(false);
  }, []);

  const acceptAll = () => {
    setConsent({ analytics: true, marketing: true });
    close();
  };

  const rejectAll = () => {
    setConsent({ analytics: false, marketing: false });
    close();
  };

  const saveSelection = () => {
    setConsent(prefs);
    close();
  };

  if (!open) return null;

  return (
    <>
      {/* Ztmavení pozadí jen v režimu detailního nastavení */}
      {showDetails && (
        <div
          className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDetails(false)}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal={showDetails}
        aria-label="Nastavení cookies"
        className={`fixed z-[61] ${
          showDetails
            ? "inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
            : "bottom-4 left-4 right-4 sm:right-auto sm:max-w-md"
        }`}
      >
        <div
          className={`relative flex max-h-[calc(100dvh-2rem)] flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-gray-900/5 animate-fade-in-up ${
            showDetails ? "w-full sm:max-w-lg sm:max-h-[min(90vh,42rem)]" : ""
          }`}
        >
          {/* Dekorativní gradient nahoře — má vlastní clip vrstvu, aby nepřebíjela scroll obsahu */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden rounded-t-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-emerald-400 opacity-90" />
            <div className="absolute -top-10 -right-8 text-[7rem] leading-none select-none opacity-20 rotate-12">
              🍪
            </div>
          </div>

          <div className="relative overflow-y-auto p-6 sm:p-7">
            {/* Hlavička */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg ring-1 ring-gray-900/5">
                🍪
              </div>
              <div className="pt-0.5">
                <h2 className="text-lg font-bold text-white drop-shadow-sm">
                  Máme rádi sušenky
                </h2>
                <p className="text-xs font-medium text-white/90 drop-shadow-sm">
                  ...a vy je můžete řídit podle sebe
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Nezbytné cookies používáme vždy, aby web fungoval (přihlášení,
              bezpečnost). Pro analytiku a marketing potřebujeme váš souhlas.
              Můžete přijmout vše, odmítnout nepovinné, nebo si vybrat.{" "}
              <Link
                href="/cookies"
                className="font-semibold text-cyan-600 underline-offset-2 hover:underline"
              >
                Zásady cookies
              </Link>
            </p>

            {/* Detailní výběr kategorií */}
            {showDetails && (
              <div className="mt-5 space-y-3">
                {/* Nezbytné — vždy zapnuté */}
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <span className="text-xl">🔒</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Nezbytné
                      </p>
                      <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Vždy aktivní
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">
                      Nutné pro funkčnost webu — přihlášení, košík poptávek,
                      zabezpečení. Nelze vypnout.
                    </p>
                  </div>
                </div>

                {CATEGORY_INFO.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 p-4 transition-colors hover:border-cyan-200 hover:bg-cyan-50/40"
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {c.title}
                        </p>
                        {/* Toggle */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={prefs[c.key]}
                          onClick={(e) => {
                            e.preventDefault();
                            setPrefs((p) => ({ ...p, [c.key]: !p[c.key] }));
                          }}
                          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                            prefs[c.key] ? "bg-cyan-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              prefs[c.key] ? "translate-x-[1.375rem]" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">
                        {c.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Tlačítka — stejná vizuální váha pro přijetí i odmítnutí */}
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="flex gap-2.5">
                <button
                  onClick={rejectAll}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
                >
                  Odmítnout vše
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
                >
                  Přijmout vše
                </button>
              </div>

              {showDetails ? (
                <button
                  onClick={saveSelection}
                  className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800"
                >
                  Uložit můj výběr
                </button>
              ) : (
                <button
                  onClick={() => setShowDetails(true)}
                  className="rounded-2xl px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                  Přizpůsobit nastavení
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
