import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt | Fachmani - Najdi ověřeného fachmana",
  description: "Kontaktujte nás s dotazy nebo zpětnou vazbou. Jsme tu pro vás.",
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children;
}
