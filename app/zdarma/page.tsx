import type { Metadata } from "next";
import CampaignLanding, { type LandingConfig } from "@/app/components/landing/CampaignLanding";

export const metadata: Metadata = {
  title: "Najděte ověřeného fachmana zdarma | Fachmani",
  description:
    "Zadejte jednu poptávku a ověření fachmani se vám sami ozvou s nabídkami. Reakce do 7 dnů, expresně do 2. Teď 100 % zdarma a bez závazků.",
  alternates: { canonical: "/zdarma" },
  openGraph: {
    title: "Najděte ověřeného fachmana zdarma | Fachmani",
    description: "Zadejte jednu poptávku a ověření fachmani se vám sami ozvou. Reakce do 7 dnů, expres do 2. Teď 100 % zdarma.",
    url: "/zdarma",
  },
};

const config: LandingConfig = {
  eyebrow: "Najděte fachmana",
  titleLead: "Zadejte jednu poptávku. Fachmani se vám",
  titleAccent: "ozvou sami.",
  subtitle:
    "Žádné obvolávání ani hledání. Popíšete, co potřebujete, a ověření profíci se vám ozvou s nabídkami. Teď 100 % zdarma.",
  heroEmoji: "🛠️",
  source: "zdarma",
  watchHeading: "Proč přes Fachmani",
  watchIntro: "Jedna poptávka, ověření profíci a žádné starosti navíc.",
  watchPoints: [
    {
      icon: "📝",
      title: "Jedna poptávka stačí",
      desc: "Nemusíte obvolávat desítky řemeslníků. Zadáte jednu poptávku a oni se ozvou vám.",
    },
    {
      icon: "✅",
      title: "Ověření profíci",
      desc: "Identitu i reference prověřujeme, takže máte garanci erudovaného odborníka a spolehlivý výsledek.",
    },
    {
      icon: "⚡",
      title: "Rychlá reakce",
      desc: "Reakci na poptávku získáte do 7 dnů, expresně do 2. Žádné týdny čekání.",
    },
    {
      icon: "⭐",
      title: "Hodnocení a profily",
      desc: "U každého fachmana vidíte profil, recenze a ceny. Rozhodnete se podle reálných zkušeností.",
    },
    {
      icon: "💬",
      title: "Komunikace na jednom místě",
      desc: "S vybraným fachmanem se domluvíte napřímo v aplikaci. Přehledně a bez prostředníků.",
    },
    {
      icon: "🎁",
      title: "Teď 100 % zdarma",
      desc: "Zadání poptávky vás nic nestojí a k ničemu vás nezavazuje. Vyberete si, jen když budete chtít.",
    },
  ],
};

export default function ZdarmaLanding() {
  return <CampaignLanding config={config} />;
}
