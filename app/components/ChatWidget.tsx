"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

type Fachman = {
  name: string;
  type: string;
  location: string | null;
  verified: boolean;
  link: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  fachmani?: Fachman[];
  poptavkaLink?: string | null;
};

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Ahoj! Jsem Fachmánek 👋 Pomůžu ti najít fachmana, vysvětlím, jak Fachmani fungují, nebo s tebou rovnou připravím poptávku. Co potřebuješ?",
};

const SUGGESTIONS = [
  "Hledám elektrikáře",
  "Jak to tu funguje?",
  "Chci zadat poptávku",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setError(null);
      const userMsg: Msg = { role: "user", content: trimmed };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setLoading(true);

      try {
        const apiMessages = history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, sessionId: sessionId.current }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Něco se pokazilo. Zkus to prosím znovu.");
          setLoading(false);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || "",
            fachmani: Array.isArray(data.fachmani) ? data.fachmani : [],
            poptavkaLink: data.poptavkaLink || null,
          },
        ]);
      } catch {
        setError("Nepodařilo se spojit se serverem. Zkontroluj připojení.");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Otevřít chat s asistentem"
          className="group fixed bottom-5 right-5 z-[55] flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3.5 text-white shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-2xl"
        >
          <span className="relative flex h-6 w-6 items-center justify-center text-xl">💬</span>
          <span className="hidden text-sm font-semibold sm:block">Poradím ti</span>
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-[56] flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-3xl sm:ring-1 sm:ring-gray-900/10">
          {/* Header */}
          <div className="relative flex items-center justify-between overflow-hidden rounded-t-none bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-4 sm:rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl backdrop-blur">
                🛠️
              </div>
              <div>
                <p className="text-sm font-bold text-white">Fachmánek</p>
                <p className="flex items-center gap-1.5 text-xs text-white/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online asistent
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Zavřít chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        : "bg-white text-gray-800 ring-1 ring-gray-100"
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Karty fachmanů */}
                  {m.fachmani && m.fachmani.length > 0 && (
                    <div className="space-y-2">
                      {m.fachmani.map((f, j) => (
                        <Link
                          key={j}
                          href={f.link}
                          onClick={() => setOpen(false)}
                          className="block rounded-2xl bg-white p-3 ring-1 ring-gray-100 transition-all hover:ring-cyan-300 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900">{f.name}</p>
                            {f.verified && (
                              <span className="flex-shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
                                ✓ Ověřeno
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {f.type}
                            {f.location ? ` · ${f.location}` : ""}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-cyan-600">Zobrazit profil →</p>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* CTA dokončení poptávky */}
                  {m.poptavkaLink && (
                    <Link
                      href={m.poptavkaLink}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
                    >
                      📝 Zkontrolovat a odeslat poptávku →
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Návrhy (jen na začátku) */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-100">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600 ring-1 ring-red-100">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white p-3 sm:rounded-b-3xl">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Napiš zprávu…"
                className="max-h-32 flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Odeslat"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white transition-all hover:shadow-lg disabled:opacity-40"
              >
                ➤
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Fachmánek je AI a může se splést. Důležité si ověř.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
