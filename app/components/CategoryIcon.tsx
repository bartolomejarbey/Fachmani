"use client";

import { Icon } from "@iconify/react";

// Renders kategorie ikonu. Pole `icon` v DB může být:
//   - emoji řetězec ("🔧", "⚡") — pro zpětnou kompatibilitu
//   - iconify ID s prefixem ("iconify:tabler:bolt", "iconify:mdi:wrench")
//
// `size` v px (default 24). `className` přebije velikost přes utility tříd
// (např. text-3xl pro emoji nebo w-10 h-10 pro SVG).
type Props = {
  icon: string | null | undefined;
  size?: number;
  className?: string;
};

export default function CategoryIcon({ icon, size = 24, className = "" }: Props) {
  if (!icon) return null;

  if (icon.startsWith("iconify:")) {
    const iconifyId = icon.slice("iconify:".length);
    return <Icon icon={iconifyId} width={size} height={size} className={className} />;
  }

  // Legacy emoji — vrátíme čistý text aby nezměnil layout (whitespace, span vs text node)
  return <span className={className}>{icon}</span>;
}

// Helper pro <option> a další text-only kontexty kde nelze renderovat SVG.
// Iconify ikony se nezobrazí (option neumí React komponenty), emoji ano.
export function iconAsTextPrefix(icon: string | null | undefined): string {
  if (!icon || icon.startsWith("iconify:")) return "";
  return `${icon} `;
}

