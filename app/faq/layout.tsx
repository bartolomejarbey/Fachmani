import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Časté dotazy | Fachmani - Najdi ověřeného fachmana",
  description: "Odpovědi na nejčastější otázky o platformě Fachmani.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
