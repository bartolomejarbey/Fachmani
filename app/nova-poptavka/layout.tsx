import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nová poptávka | Fachmani - Najdi ověřeného fachmana",
  description: "Zadejte poptávku zdarma a získejte nabídky od ověřených fachmanů ve vašem okolí.",
};

export default function NovaPoptavkaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
