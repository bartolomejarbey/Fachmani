"use client";

import CategoryIcon from "./CategoryIcon";

type Cat = { id: string; name: string; icon: string; parent_id: string | null; sort_order: number | null };

/**
 * Vizuální výběr kategorie — dlaždice s ikonami místo nudného <select>.
 * Hlavní kategorie jako mřížka dlaždic, podkategorie jako chip-y.
 * Zachovává sémantiku původního selectu: výběr hlavní → categoryId = main,
 * výběr podkategorie → categoryId = sub.
 */
export default function CategoryPicker({
  categories,
  mainId,
  subId,
  onMain,
  onSub,
}: {
  categories: Cat[];
  mainId: string;
  subId: string;
  onMain: (id: string) => void;
  onSub: (id: string) => void;
}) {
  const mains = categories.filter((c) => c.parent_id === null);
  const subs = categories.filter((c) => c.parent_id === mainId);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {mains.map((cat) => {
          const active = mainId === cat.id;
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => onMain(cat.id)}
              aria-pressed={active}
              className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all duration-200 ${
                active
                  ? "scale-[1.03] border-transparent bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                  : "border-gray-100 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/60 hover:shadow-md"
              }`}
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-xl transition-colors ${
                  active ? "bg-white/20" : "bg-gray-50 group-hover:bg-white"
                }`}
              >
                <CategoryIcon icon={cat.icon} className="text-[26px] leading-none" />
              </span>
              <span className="text-[11px] font-semibold leading-tight line-clamp-2">{cat.name}</span>
              {active && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-bold text-cyan-600 shadow ring-2 ring-cyan-500">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mainId && subs.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-cyan-50/60 p-3 cp-fade-in">
          <span className="mr-1 text-xs font-medium text-cyan-700">Upřesnit:</span>
          {subs.map((s) => {
            const active = subId === s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => onSub(active ? mainId : s.id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-transparent bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow"
                    : "border-gray-200 bg-white text-gray-600 hover:border-cyan-300 hover:text-cyan-700"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes cpFade { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
        .cp-fade-in { animation: cpFade .25s ease-out both }
        @media (prefers-reduced-motion: reduce) { .cp-fade-in { animation: none } }
      `}</style>
    </div>
  );
}
