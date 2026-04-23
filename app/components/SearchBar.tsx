"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  entity_type: "provider" | "seed_provider" | "category";
  entity_id: string;
  title: string;
  similarity: number;
};

type Props = {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Kam skočit po submitu nebo výběru suggestion. */
  submitTo?: "/hledat";
};

export default function SearchBar({
  initialQuery = "",
  placeholder = "Hledat fachmana, kategorii, lokalitu...",
  autoFocus = false,
  submitTo = "/hledat",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(query.trim())}`,
          { signal: ctl.signal }
        );
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions || []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        // aborted or network error — ignore
      }
    }, 180);

    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const submitToResults = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) return;
      router.push(`${submitTo}?q=${encodeURIComponent(trimmed)}`);
      setOpen(false);
    },
    [router, submitTo]
  );

  const selectSuggestion = useCallback(
    (s: Suggestion) => {
      // Vyplníme text do inputu a skočíme na výsledky s touto query.
      // (klikání přímo na entity dělá až /hledat výsledková stránka.)
      setQuery(s.title);
      submitToResults(s.title);
    },
    [submitToResults]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitToResults(query);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        selectSuggestion(suggestions[activeIdx]);
      } else {
        submitToResults(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const typeLabel: Record<Suggestion["entity_type"], string> = {
    provider: "Fachman",
    seed_provider: "Fachman",
    category: "Kategorie",
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-5 py-4 pr-14 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
          aria-label="Hledat"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <button
          type="button"
          onClick={() => submitToResults(query)}
          disabled={query.trim().length < 2}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-200 text-white rounded-xl px-4 py-2 font-semibold transition-colors"
          aria-label="Spustit vyhledávání"
        >
          Hledat
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.entity_type}-${s.entity_id}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                i === activeIdx ? "bg-cyan-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-gray-900 truncate">{s.title}</span>
              <span className="text-xs text-gray-400 ml-3 shrink-0">{typeLabel[s.entity_type]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
