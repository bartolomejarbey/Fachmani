import type { Metadata } from "next";
import CampaignLanding, { type LandingConfig } from "@/app/components/landing/CampaignLanding";

export const metadata: Metadata = {
  title: "Elektroinstalace od ověřeného fachmana | Fachmani",
  description:
    "U elektroinstalace rozhoduje to, co je schované za zdí. Revize, proudový chránič, dotažené spoje. Zadejte poptávku zdarma a ověření elektrikáři se vám sami ozvou.",
  alternates: { canonical: "/elektroinstalace" },
  openGraph: {
    title: "Elektroinstalace od ověřeného fachmana | Fachmani",
    description: "U elektroinstalace rozhoduje to, co je schované za zdí. Zadejte poptávku zdarma — ověření elektrikáři se vám ozvou.",
    url: "/elektroinstalace",
  },
};

const config: LandingConfig = {
  eyebrow: "Elektroinstalace",
  titleLead: "U elektroinstalace rozhoduje to,",
  titleAccent: "co je schované.",
  subtitle:
    "Zásuvka může vypadat hotově — kvalitu a bezpečnost ale určuje práce za zdí. S ověřeným elektrikářem ji nemusíte hlídat sami.",
  heroEmoji: "⚡",
  source: "elektroinstalace",
  preCategoryId: "dd9345d5-14cf-4b6f-a42c-a2428684e77a",
  preCategoryName: "Elektrikář",
  watchHeading: "Na čem u elektřiny opravdu záleží",
  watchIntro: "Čtyři skryté detaily, které rozhodují o bezpečnosti i budoucích opravách.",
  watchPoints: [
    {
      icon: "🧰",
      title: "Přístupné rozvodné krabice",
      desc: "Zazděná krabice bez přístupu komplikuje každou budoucí opravu. Přístupné krabice šetří čas, peníze i bourání.",
    },
    {
      icon: "🔗",
      title: "Dotažený spoj za zásuvkou",
      desc: "Volný nebo špatně dotažený spoj se může přehřívat. Správně provedený spoj drží bezpečně a snižuje riziko poruchy.",
    },
    {
      icon: "🛡️",
      title: "Proudový chránič",
      desc: "V koupelně je elektřina blízko vody. Chránič (RCD) je zásadní prvek ochrany, který pomáhá předcházet nebezpečným situacím.",
    },
    {
      icon: "📋",
      title: "Revize z reálného měření",
      desc: "Revize nemá být jen papír do šuplíku. Reálné měření ukáže, jestli je elektroinstalace bezpečná a provedená správně.",
    },
    {
      icon: "🔍",
      title: "Kvalita schovaná za zdí",
      desc: "Kabeláž, jištění a spoje jsou to hlavní — a zároveň to, co po dokončení neuvidíte. Proto je důležité, kdo to dělá.",
    },
    {
      icon: "✅",
      title: "Ověřený odborník",
      desc: "S prověřeným elektrikářem máte garanci erudovaného odborníka a spolehlivý výsledek bez starostí.",
    },
  ],
};

export default function ElektroinstalaceLanding() {
  return <CampaignLanding config={config} />;
}
