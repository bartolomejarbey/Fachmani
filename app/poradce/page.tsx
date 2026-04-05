"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

type RecommendedProvider = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
};

const QUICK_SUGGESTIONS = [
  "🔧 Potřebuji instalatéra",
  "🎨 Chci vymalovat byt",
  "💻 Hledám webového vývojáře",
  "🏠 Plánuji rekonstrukci",
];

const WELCOME_MESSAGE = "Ahoj! 👋 Jsem tvůj asistent pro hledání fachmanů. Řekni mi co potřebuješ a já ti najdu toho správného z naší databáze. Co hledáš?";

const SEARCH_TRIGGER = "hledám pro tebe v naší databázi";

export default function PoradcePage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "ai", content: WELCOME_MESSAGE },
  ]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProvider[]>([]);
  const [noMatches, setNoMatches] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typing, recommendations, noMatches]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    const newApiMessages: ApiMessage[] = [
      ...apiMessages,
      { role: "user", content: text.trim() },
    ];

    const newCount = userMessageCount + 1;
    setMessages((prev) => [...prev, userMsg]);
    setApiMessages(newApiMessages);
    setUserMessageCount(newCount);
    setInput("");
    setTyping(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMessages, sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.rateLimited) {
          setMessages((prev) => [
            ...prev,
            { id: `ai-${Date.now()}`, role: "ai", content: `⏱️ ${data.error}` },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { id: `ai-${Date.now()}`, role: "ai", content: `❌ ${data.error || "Došlo k chybě. Zkus to prosím znovu."}` },
          ]);
        }
        return;
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: data.message,
      };

      setApiMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      setMessages((prev) => [...prev, aiMsg]);

      // Detect search trigger phrase
      if (data.message.toLowerCase().includes(SEARCH_TRIGGER)) {
        const conversationContext = [...newApiMessages, { role: "assistant" as const, content: data.message }]
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        try {
          const recResponse = await fetch("/api/ai/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationContext }),
          });

          if (recResponse.ok) {
            const recData = await recResponse.json();
            const recs = recData.recommendations || [];
            setRecommendations(recs);
            setNoMatches(recs.length === 0);
          }
        } catch {
          // Recommendations are optional, don't block chat
        }
      }
    } catch {
      setError("Nepodařilo se spojit s AI poradcem. Zkus to znovu.");
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Fixed header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors mr-1">
              ←
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Najdi fachmana</h1>
              <p className="text-xs text-gray-500">AI asistent pro hledání profesionálů</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable chat area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "ai" && (
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-sm mr-3 flex-shrink-0 mt-1">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    : "bg-white border border-gray-200 text-gray-700"
                }`}
              >
                {msg.role === "ai" ? (
                  <div className="prose prose-sm max-w-none prose-slate">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-2">{children}</h3>,
                        h2: ({ children }) => <h3 className="text-base font-bold mt-3 mb-2">{children}</h3>,
                        h3: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1">{children}</h4>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                        hr: () => <hr className="my-3 border-gray-200" />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Quick suggestions — only at start */}
          {messages.length === 1 && !typing && (
            <div className="flex flex-wrap gap-2 pl-11">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-sm mr-3 flex-shrink-0">
                🤖
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                🎯 Nalezení fachmani
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Na základě tvých požadavků jsem našel tyto fachmany v naší databázi:
              </p>
              <div className="space-y-3">
                {recommendations.map((provider) => (
                  <Link
                    key={provider.id}
                    href={`/fachman/${provider.id}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
                  >
                    {provider.avatar_url ? (
                      <img
                        src={provider.avatar_url}
                        alt={provider.full_name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {provider.full_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 truncate">
                          {provider.full_name}
                        </span>
                        {provider.is_verified && (
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                      </div>
                      {provider.location && (
                        <div className="text-sm text-gray-500 truncate">
                          📍 {provider.location}
                        </div>
                      )}
                      {provider.bio && (
                        <div className="text-xs text-gray-400 truncate mt-1">
                          {provider.bio}
                        </div>
                      )}
                    </div>
                    <div className="text-cyan-600 font-semibold text-sm flex-shrink-0">
                      Zobrazit →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No matches fallback */}
          {noMatches && recommendations.length === 0 && (
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">🔍</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    Zatím na to nemáme fachmana
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Naše platforma je čerstvě spuštěná a databáze fachmanů se každým dnem rozrůstá.
                    Na tento typ služby momentálně nikoho nemáme, ale v řádu týdnů až měsíce očekáváme
                    první ověřené fachmany pro tuto oblast.
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Mezitím můžeš:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
                    <li>Zadat veřejnou poptávku — dáme ti vědět jakmile se fachman přihlásí</li>
                    <li>Zaregistrovat se k odběru novinek</li>
                  </ul>
                  <Link
                    href="/nova-poptavka"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg transition-shadow"
                  >
                    Zadat veřejnou poptávku →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* CTA banner after 3 messages */}
          {userMessageCount >= 3 && !noMatches && (
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
              <p className="font-bold text-gray-900 mb-2">Zadej poptávku a nech fachmany, ať ti pošlou nabídky</p>
              <Link
                href="/nova-poptavka"
                className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all mt-2"
              >
                Zadat poptávku zdarma →
              </Link>
              <p className="text-gray-500 text-sm mt-3">Nebo pokračuj v chatu — rád ti najdu dalšího fachmana.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed input bar */}
      <div className="bg-white border-t flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napiš co hledáš..."
              rows={1}
              maxLength={1000}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all flex-shrink-0"
            >
              Odeslat
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Propojím tě s ověřenými fachmany z naší databáze.
          </p>
        </div>
      </div>
    </div>
  );
}
