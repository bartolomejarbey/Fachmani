"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

// Emoji rychlý výběr — ponecháno z původního pickeru aby admin nemusel měnit zvyk.
const COMMON_EMOJI = [
  "🔧", "⚡", "🔨", "🎨", "🏠", "🚗", "💻", "📱", "🌿", "🧹",
  "📦", "🔒", "💡", "🚿", "❄️", "🔥", "📸", "✂️", "🧰", "🛠️",
  "🪚", "🪛", "🪟", "🚪", "🏗️", "🪜", "🧱", "🪤", "🔑", "🗝️",
  "🚰", "🛁", "🚽", "🪣", "🧴", "🧽", "🪒", "🧷", "📐", "📏",
];

// Doporučené iconify "starter" sady — admin uvidí primárně tyhle, ale search jede přes všechny.
const STARTER_ICONS = [
  "tabler:bolt", "tabler:hammer", "tabler:wrench", "tabler:tools-kitchen-2",
  "tabler:home", "tabler:building", "tabler:plant-2", "tabler:droplet",
  "tabler:flame", "tabler:car", "tabler:devices", "tabler:device-mobile",
  "mdi:wrench", "mdi:hammer-screwdriver", "mdi:flash", "mdi:water-pump",
  "mdi:home-roof", "mdi:tree", "mdi:fire", "mdi:car-wrench",
  "ph:wrench", "ph:hammer", "ph:lightning", "ph:plant",
  "ph:house", "ph:wrench-bold", "ph:paint-brush", "ph:scissors",
  "fluent:wrench-24-regular", "fluent:vehicle-car-24-regular",
  "fluent:home-24-regular", "fluent:lightbulb-24-regular",
];

type Props = {
  value: string;
  onChange: (icon: string) => void;
};

type SearchResp = { icons?: string[] };

export default function IconPicker({ value, onChange }: Props) {
  const [tab, setTab] = useState<"emoji" | "illustrated">(
    value.startsWith("iconify:") ? "illustrated" : "emoji"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search proti Iconify API.
  useEffect(() => {
    if (tab !== "illustrated") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://api.iconify.design/search?query=${encodeURIComponent(query.trim())}&limit=64`;
        const res = await fetch(url);
        const json: SearchResp = await res.json();
        setResults(json.icons ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, tab]);

  const currentIconify = value.startsWith("iconify:") ? value.slice("iconify:".length) : null;

  return (
    <div className="space-y-3">
      {/* Aktuální výběr — preview */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Vybráno:</span>
        {currentIconify ? (
          <span className="flex items-center gap-2">
            <Icon icon={currentIconify} width={28} height={28} className="text-white" />
            <code className="text-xs text-slate-300">{currentIconify}</code>
          </span>
        ) : value ? (
          <span className="text-2xl">{value}</span>
        ) : (
          <span className="text-slate-500 text-sm">— žádná —</span>
        )}
      </div>

      {/* Tab přepínač */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab("emoji")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "emoji"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Emoji
        </button>
        <button
          type="button"
          onClick={() => setTab("illustrated")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "illustrated"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Ilustrované (Iconify)
        </button>
      </div>

      {tab === "emoji" ? (
        <div className="grid grid-cols-10 gap-2">
          {COMMON_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`w-10 h-10 text-xl rounded-lg border border-white/10 hover:bg-white/10 transition-colors ${
                value === emoji ? "bg-cyan-500/20 border-cyan-500" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat (anglicky): wrench, hammer, electrician, paint, plant…"
            className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {searching && <div className="text-xs text-slate-500">Hledám…</div>}
          {!query.trim() && (
            <div>
              <div className="text-xs text-slate-500 mb-2">Doporučené</div>
              <div className="grid grid-cols-10 gap-2">
                {STARTER_ICONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange(`iconify:${id}`)}
                    title={id}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-white ${
                      currentIconify === id ? "bg-cyan-500/20 border-cyan-500" : ""
                    }`}
                  >
                    <Icon icon={id} width={22} height={22} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {query.trim() && results.length > 0 && (
            <div className="grid grid-cols-10 gap-2 max-h-72 overflow-y-auto">
              {results.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(`iconify:${id}`)}
                  title={id}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-white ${
                    currentIconify === id ? "bg-cyan-500/20 border-cyan-500" : ""
                  }`}
                >
                  <Icon icon={id} width={22} height={22} />
                </button>
              ))}
            </div>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <div className="text-sm text-slate-500">Žádný výsledek pro „{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
