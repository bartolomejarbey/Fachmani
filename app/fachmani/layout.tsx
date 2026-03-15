import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ověření fachmani | Fachmani - Najdi ověřeného fachmana",
  description: "Najděte ověřené řemeslníky a profesionály ve vašem okolí. Prohlédněte si hodnocení a portfolio.",
};

export default function FachmaniLayout({ children }: { children: React.ReactNode }) {
  return children;
}
