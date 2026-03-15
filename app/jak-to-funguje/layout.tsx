import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jak to funguje | Fachmani - Najdi ověřeného fachmana",
  description: "Zjistěte jak Fachmani funguje. Zadejte poptávku, získejte nabídky a vyberte si fachmana.",
};

export default function JakToFungujeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
