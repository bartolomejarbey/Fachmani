"use client";

import Link from "next/link";
import { useCallback } from "react";

type Result = {
  entity_type: "provider" | "seed_provider" | "category" | "demand" | "offer";
  entity_id: string;
  title: string;
  snippet: string;
  image_url: string | null;
  location: string | null;
  boost_verified: boolean;
  tier: string;
  rank: number;
};

type Props = {
  query: string;
  results: Result[];
};

export default function SearchResults({ query, results }: Props) {
  const trackClick = useCallback(
    (r: Result, position: number) => {
      void fetch("/api/search/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          entityType: r.entity_type,
          entityId: r.entity_id,
          position,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [query]
  );

  if (results.length === 0) {
    return (
      <div className="bg-gray-50 rounded-3xl p-12 text-center">
        <p className="text-gray-600 text-lg">
          Pro dotaz „<strong>{query}</strong>" nebyly nalezeny žádné výsledky.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Zkuste obecnější termín nebo projděte všechny{" "}
          <Link href="/kategorie" className="text-cyan-600 hover:underline">
            kategorie
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {results.map((r, i) => {
        const position = i + 1;
        const href = hrefFor(r);
        return (
          <li
            key={`${r.entity_type}-${r.entity_id}`}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <Link
              href={href}
              onClick={() => trackClick(r, position)}
              className="flex gap-4 items-start"
            >
              {r.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white flex items-center justify-center shrink-0 text-xl font-bold">
                  {r.title?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{r.title}</h3>
                  <span className="text-xs text-gray-400 shrink-0">{labelFor(r.entity_type)}</span>
                  {r.boost_verified && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                      ✓ Ověřeno
                    </span>
                  )}
                </div>
                {r.snippet && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.snippet}</p>
                )}
                {r.location && (
                  <p className="text-xs text-gray-500 mt-1">📍 {r.location}</p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function labelFor(type: Result["entity_type"]): string {
  if (type === "category") return "Kategorie";
  if (type === "demand") return "Poptávka";
  if (type === "offer") return "Nabídka";
  return "Fachman";
}

function hrefFor(r: Result): string {
  if (r.entity_type === "category") return `/kategorie`;
  if (r.entity_type === "demand") return `/poptavka/${r.entity_id}`;
  if (r.entity_type === "offer") return `/nabidky#offer-${r.entity_id}`;
  // seed_provider dostane prefix "seed_", aby existující /fachman/[id] routa fungovala.
  if (r.entity_type === "seed_provider") return `/fachman/seed_${r.entity_id}`;
  return `/fachman/${r.entity_id}`;
}
