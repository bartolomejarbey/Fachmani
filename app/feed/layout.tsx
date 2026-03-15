import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | Fachmani - Najdi ověřeného fachmana",
  description: "Sdílejte své projekty a inspirujte ostatní. Sledujte příspěvky od fachmanů a zákazníků.",
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
