import type { Metadata } from "next";
import CampaignLanding, { type LandingConfig } from "@/app/components/landing/CampaignLanding";

export const metadata: Metadata = {
  title: "Rekonstrukce koupelny od ověřeného fachmana | Fachmani",
  description:
    "Krásná koupelna nestačí — rozhoduje skrytá práce: hydroizolace, spád k odtoku, odvětrání. Zadejte poptávku zdarma a ověření fachmani se vám sami ozvou.",
  alternates: { canonical: "/koupelna" },
};

const config: LandingConfig = {
  eyebrow: "Koupelna · Rekonstrukce",
  titleLead: "Krásná koupelna nestačí. Rozhoduje",
  titleAccent: "to, co nevidíte.",
  subtitle:
    "Obklad je jen finále — kvalitu a životnost určují skryté detaily pod ním. S ověřeným fachmanem je nemusíte hlídat sami.",
  ctaLabel: "Zadat poptávku zdarma",
  ctaHref: "/nova-poptavka?kategorie=Rekonstrukce",
  heroEmoji: "🚿",
  heroEmojiAlt: "🛁",
  watchHeading: "Na čem u koupelny opravdu záleží",
  watchIntro: "Skryté detaily, které rozhodují o tom, jestli koupelna vydrží — nebo začne brzy trpět.",
  watchPoints: [
    {
      icon: "💧",
      title: "Hydroizolace kolem sprchy",
      desc: "Hydroizolace drží vodu tam, kde má být. V rozích a kolem prostupů vznikají nejslabší místa — když nejsou utěsněná, vlhkost se dostane pod obklad.",
    },
    {
      icon: "🛁",
      title: "Napojení vany",
      desc: "Malé místo s velkým dopadem. Když není napojení vany uděláno správně, voda se může dostat za vanu a škody se objeví až později.",
    },
    {
      icon: "📐",
      title: "Správný spád k odtoku",
      desc: "Podlaha musí vodu přirozeně vést k odtoku. Při špatném spádu voda zůstává stát, zatéká do spár a koupelna rychleji trpí.",
    },
    {
      icon: "🌬️",
      title: "Odvětrání proti vlhkosti",
      desc: "Po sprchování musí pára rychle ven. Když vzduch necirkuluje, vlhkost se drží, zvyšuje riziko plísní a zkracuje životnost povrchů.",
    },
    {
      icon: "🧱",
      title: "Skrytá práce pod obkladem",
      desc: "U koupelny rozhoduje hlavně to, co nevidíte. Obklad je jen finále — kvalitu určí příprava a izolace pod ním.",
    },
    {
      icon: "✅",
      title: "Ověřený fachman",
      desc: "S prověřeným řemeslníkem máte jistotu, že skryté detaily jsou udělané správně a koupelna vydrží roky.",
    },
  ],
};

export default function KoupelnaLanding() {
  return <CampaignLanding config={config} />;
}
