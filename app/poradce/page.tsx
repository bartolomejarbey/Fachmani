"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

const QUICK_SUGGESTIONS = [
  "🔧 Potřebuji instalatéra",
  "🎨 Chci vymalovat byt",
  "💻 Hledám webového vývojáře",
  "🏠 Plánuji rekonstrukci",
];

const WELCOME_MESSAGE = "Ahoj! 👋 Jsem AI poradce na Fachmani.org. Pomohu vám zorientovat se v tom, jakého profesionála potřebujete, na co si dát pozor a jaká je přibližná cena. Co potřebujete vyřešit?";

function getAIResponse(userMessage: string, messageCount: number): string {
  // TODO: Nahradit mock odpovědi voláním Anthropic API
  // const response = await fetch("/api/ai-chat", { method: "POST", body: JSON.stringify({ messages }) })

  const msg = userMessage.toLowerCase();
  let response = "";

  if (/instalat|voda|kotel|topení|topit|baterie|koupeln/.test(msg)) {
    response = "Pro instalatérské práce doporučuji:\n\n📋 **Na co si dát pozor:**\n- Ověřte že má živnostenský list\n- Požadujte rozpis materiálu a práce zvlášť\n- Domluvte se na záruční době\n\n💰 **Orientační ceny:**\n- Výměna baterie: 800–2 000 Kč\n- Oprava kotle: 2 000–5 000 Kč\n- Rekonstrukce koupelny: 50 000–150 000 Kč";
  } else if (/malíř|malovat|malování|vymalovat|nátěr/.test(msg)) {
    response = "Pro malířské práce doporučuji:\n\n📋 **Na co si dát pozor:**\n- Chtějte vidět reference a fotky předchozích prací\n- Domluvte se kdo zajistí materiál\n- Zkontrolujte jestli cena zahrnuje přípravu povrchů\n\n💰 **Orientační ceny:**\n- Vymalování pokoje: 3 000–6 000 Kč\n- Celý byt 2+1: 15 000–25 000 Kč\n- Dekorativní malba: od 500 Kč/m²";
  } else if (/web|programátor|vývojář|aplikac|IT|stránk/.test(msg)) {
    response = "Pro webové a IT služby doporučuji:\n\n📋 **Na co si dát pozor:**\n- Chtějte portfolio s referencemi\n- Domluvte se na technologiích předem\n- Stanovte jasný rozsah projektu\n\n💰 **Orientační ceny:**\n- Jednoduchý web: 15 000–40 000 Kč\n- E-shop: 40 000–150 000 Kč\n- Mobilní aplikace: 100 000–500 000 Kč";
  } else if (/rekonstrukc|přestavb|stavba|zedník|podlah/.test(msg)) {
    response = "Pro rekonstrukce doporučuji:\n\n📋 **Na co si dát pozor:**\n- Nechte si udělat minimálně 3 cenové nabídky\n- Požadujte podrobný rozpočet\n- Stanovte smluvní pokuty za zpoždění\n\n💰 **Orientační ceny:**\n- Rekonstrukce koupelny: 80 000–200 000 Kč\n- Rekonstrukce kuchyně: 100 000–300 000 Kč\n- Kompletní byt 3+1: 500 000–1 500 000 Kč";
  } else if (/úklid|uklíz|uklízení|čištění/.test(msg)) {
    response = "Pro úklidové služby doporučuji:\n\n📋 **Na co si dát pozor:**\n- Domluvte se na rozsahu úklidu předem\n- Zeptejte se jaké prostředky používají\n- Ověřte pojištění pro případ škody\n\n💰 **Orientační ceny:**\n- Běžný úklid bytu: 1 500–3 000 Kč\n- Generální úklid: 3 000–8 000 Kč\n- Mytí oken (byt): 1 000–2 500 Kč";
  } else if (/stěhov|stěhování|přestěhov/.test(msg)) {
    response = "Pro stěhování doporučuji:\n\n📋 **Na co si dát pozor:**\n- Požadujte prohlídku bytu před nacenením\n- Ověřte pojištění přepravovaných věcí\n- Domluvte se na balení — sami nebo firma?\n\n💰 **Orientační ceny:**\n- Stěhování garsonky (v rámci města): 3 000–6 000 Kč\n- Stěhování bytu 2+1: 6 000–12 000 Kč\n- Meziměstské stěhování: 10 000–25 000 Kč";
  } else if (/elektr|zásuvk|světl|rozvod/.test(msg)) {
    response = "Pro elektrikářské práce doporučuji:\n\n📋 **Na co si dát pozor:**\n- Elektrikář MUSÍ mít oprávnění (§6 nebo §8)\n- Požadujte revizní zprávu po dokončení\n- Nikdy nenechávejte dělat elektriku nekvalifikovanou osobu\n\n💰 **Orientační ceny:**\n- Výměna zásuvky: 500–1 000 Kč\n- Instalace lustru: 800–1 500 Kč\n- Rekonstrukce elektroinstalace bytu: 50 000–120 000 Kč";
  } else if (/cena|kolik|stojí|rozpočet|levn|drah/.test(msg)) {
    response = "Cena závisí na konkrétní službě. 💡 Obecně platí:\n\n- **Řemeslné práce:** 300–600 Kč/hod\n- **IT a marketing:** 500–2 000 Kč/hod\n- **Úklid a pomoc v domácnosti:** 200–400 Kč/hod\n\nŘekněte mi konkrétně co potřebujete a dám vám přesnější odhad.";
  } else if (/díky|děkuj|dekuj|dík|super|skvěl/.test(msg)) {
    response = "Rádo se stalo! 😊 Pokud budete potřebovat cokoliv dalšího, neváhejte se zeptat. Hodně štěstí s vaším projektem!";
  } else {
    response = "Rozumím! Abych vám mohl lépe poradit, řekněte mi:\n\n1. **O jakou službu se jedná?** (řemeslník, IT, marketing...)\n2. **Kde se nacházíte?** (město/oblast)\n3. **Jaký je váš rozpočet?**\n\nNa základě toho vám doporučím správný postup.";
  }

  // After 3 user messages, add CTA
  if (messageCount >= 3) {
    response += "\n\n---\n\n✅ **Chcete to vyřešit?** Zadejte poptávku a profesionálové vám pošlou nabídky do 24 hodin!";
  }

  return response;
}

function formatContent(content: string) {
  // Simple markdown-like formatting
  return content.split("\n").map((line, i) => {
    let formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr class="my-3 border-gray-200" />');

    if (formatted.startsWith("- ")) {
      formatted = `<span class="flex gap-2"><span>•</span><span>${formatted.slice(2)}</span></span>`;
    }

    return <span key={i} dangerouslySetInnerHTML={{ __html: formatted + (i < content.split("\n").length - 1 ? "<br/>" : "") }} />;
  });
}

export default function PoradcePage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "ai", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    const newCount = userMessageCount + 1;
    setMessages((prev) => [...prev, userMsg]);
    setUserMessageCount(newCount);
    setInput("");
    setTyping(true);

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    const aiResponse = getAIResponse(text, newCount);
    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "ai",
      content: aiResponse,
    };

    setTyping(false);
    setMessages((prev) => [...prev, aiMsg]);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="pt-20 bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-gray-900">AI Poradce</h1>
              <p className="text-sm text-gray-500">Pomohu vám najít správného fachmana</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
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
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.role === "ai" ? formatContent(msg.content) : msg.content}
                </div>
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

          {/* CTA banner after 3 messages */}
          {userMessageCount >= 3 && (
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
              <p className="font-bold text-gray-900 mb-2">Zadejte poptávku a nechte fachmany, ať vám pošlou nabídky</p>
              <Link
                href="/nova-poptavka"
                className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all mt-2"
              >
                Zadat poptávku zdarma →
              </Link>
              <p className="text-gray-500 text-sm mt-3">Nebo pokračujte v chatu — rád zodpovím další dotazy.</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napište svůj dotaz..."
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
            AI poradce poskytuje orientační informace. Pro přesnou nabídku zadejte poptávku.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
