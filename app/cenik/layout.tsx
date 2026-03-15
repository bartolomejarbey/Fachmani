import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ceník | Fachmani - Najdi ověřeného fachmana",
  description: "Ceník služeb pro fachmany. Porovnejte plány Free, Premium a Business.",
};

export default function CenikLayout({ children }: { children: React.ReactNode }) {
  return children;
}
