import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrace | Fachmani",
  description: "Zaregistrujte se na platformě Fachmani. Jako zákazník nebo fachman.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
