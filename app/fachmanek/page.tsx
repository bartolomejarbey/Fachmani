"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { isIOSNative } from "@/lib/native";
import { useSettings } from "@/lib/useSettings";

type Fachman = { name: string; type: string; location: string | null; verified: boolean; link: string };
type Msg = { role: "user" | "assistant"; content: string; fachmani?: Fachman[]; poptavkaLink?: string | null };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Ahoj! Jsem Fachmánek 👋 Pomůžu ti najít ověřeného fachmana, vysvětlím, jak to tu funguje, nebo s tebou rovnou připravím poptávku. Co potřebuješ?",
};
const SUGGESTIONS = ["Hledám elektrikáře v Praze", "Jak Fachmani fungují?", "Chci zadat poptávku"];

export default function FachmanekPage() {
  const router = useRouter();
  const { settings, loaded } = useSettings();

  // Gating: feature flag (admin) + iOS (nemoderovaná AI je v aplikaci vypnutá).
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (isIOSNative()) {
      setBlocked(true);
      router.replace("/fachmani");
      return;
    }
    if (loaded && !settings.features.fachmanek_enabled) {
      setBlocked(true);
      router.replace("/");
    }
  }, [loaded, settings.features.fachmanek_enabled, router]);

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setError(null);
      const history = [...messages, { role: "user" as const, content: trimmed }];
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
    [messages, loading],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (blocked) return null;

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50">
      <Navbar />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-3 pt-20 sm:px-4">
        {/* Hlavička chatroomu */}
        <div className="flex items-center gap-3 border-b border-gray-100 py-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-xl text-white shadow-md">
            🛠️
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Fachmánek</h1>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AI asistent · najde ti fachmana
            </p>
          </div>
        </div>

        {/* Zprávy */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-5">
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

                {m.fachmani && m.fachmani.length > 0 && (
                  <div className="space-y-2">
                    {m.fachmani.map((f, j) => (
                      <Link
                        key={j}
                        href={f.link}
                        className="block rounded-2xl bg-white p-3 ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-cyan-300"
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

                {m.poptavkaLink && (
                  <Link
                    href={m.poptavkaLink}
                    className="block rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
                  >
                    📝 Zkontrolovat a odeslat poptávku →
                  </Link>
                )}
              </div>
            </div>
          ))}

          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-cyan-200 bg-white px-3.5 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-50"
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
            <div className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600 ring-1 ring-red-100">{error}</div>
          )}
        </div>

        {/* Vstup */}
        <div className="border-t border-gray-100 bg-gray-50 py-3">
          <div className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={2000}
              placeholder="Napiš zprávu Fachmánkovi…"
              className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-gray-800 outline-none"
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
    </div>
  );
}
