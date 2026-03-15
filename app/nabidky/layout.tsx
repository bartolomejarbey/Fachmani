import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nabídky služeb | Fachmani - Najdi ověřeného fachmana",
  description: "Prohlédněte si nabídky služeb od ověřených fachmanů. Najděte správného profesionála pro váš projekt.",
};

export default function NabidkyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
