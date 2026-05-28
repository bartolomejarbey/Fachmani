"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number; // px — výchozí 40
  className?: string;
  ringClass?: string; // např. "ring-2 ring-white"
  // Optional online indikátor v pravém spodním rohu
  online?: boolean;
};

// Determinist barva z jména — stabilní napříč rendery (chat head pro stejného uživatele
// má vždy stejnou barvu i bez avataru).
const PALETTE = [
  "from-cyan-500 to-blue-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-indigo-500",
  "from-rose-500 to-red-500",
  "from-lime-500 to-green-500",
  "from-sky-500 to-cyan-500",
];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = 40,
  className = "",
  ringClass = "",
  online = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const displayName = (name ?? "").trim() || "?";
  const gradient = gradientFor(displayName);
  const initials = initialsFor(displayName);
  const showImage = src && !failed;

  // Velikost text fontu ~ 40% velikosti avataru (sm size → menší písmo)
  const fontSize = Math.max(11, Math.round(size * 0.4));

  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${ringClass} ${className}`}
      style={{ width: size, height: size }}
      aria-label={displayName}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={displayName}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} font-semibold text-white`}
          style={{ fontSize }}
        >
          {initials}
        </span>
      )}
      {online && (
        <span
          className="absolute right-0 bottom-0 block rounded-full bg-emerald-500 ring-2 ring-white"
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
