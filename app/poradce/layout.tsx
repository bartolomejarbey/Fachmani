import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Poradce | Fachmani - Najdi ověřeného fachmana",
  description: "AI poradce vám pomůže najít správného profesionála, poradí s cenami a na co si dát pozor.",
};

export default function PoradceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
