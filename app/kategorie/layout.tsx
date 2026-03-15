import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kategorie služeb | Fachmani - Najdi ověřeného fachmana",
  description: "Prohlédněte si kategorie služeb. Od elektrikářů po malíře, najděte fachmana v oboru, který potřebujete.",
};

export default function KategorieLayout({ children }: { children: React.ReactNode }) {
  return children;
}
