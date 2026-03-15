import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro fachmany | Fachmani - Najdi ověřeného fachmana",
  description: "Proč se stát fachmanem? Získejte zakázky, budujte reputaci a rostěte s námi.",
};

export default function ProFachmanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
