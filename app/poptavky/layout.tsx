import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poptávky | Fachmani - Najdi ověřeného fachmana",
  description: "Prohlédněte si aktuální poptávky po řemeslnících a profesionálech. Reagujte na zakázky ve vašem oboru.",
};

export default function PoptavkyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
