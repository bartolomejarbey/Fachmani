import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Zásady používání cookies | Fachmani",
  description:
    "Jaké cookies platforma Fachmani používá, k čemu slouží a jak spravovat svůj souhlas.",
  alternates: { canonical: "/cookies" },
};

const doc: LegalDoc = {
  kicker: "🍪 COOKIES",
  title: "Zásady používání cookies",
  subtitle: "Informace o souborech cookies a obdobných technologiích na platformě Fachmani.",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Cookies jsou malé soubory ukládané ve vašem prohlížeči. Některé jsou nezbytné pro fungování webu, jiné nám pomáhají web zlepšovat — ty používáme jen s vaším souhlasem.",
  related: [
    { href: "/gdpr", label: "Ochrana osobních údajů" },
    { href: "/vop", label: "Obchodní podmínky" },
  ],
  sections: [
    {
      id: "co",
      title: "1. Co jsou cookies",
      blocks: [
        {
          type: "p",
          text: "Cookies a obdobné technologie (např. localStorage) umožňují webu zapamatovat si informace o vaší návštěvě — například přihlášení, předvolby nebo statistiky používání. Cookies mohou být relační (smažou se po zavření prohlížeče) nebo trvalé (zůstávají po stanovenou dobu).",
        },
      ],
    },
    {
      id: "kategorie",
      title: "2. Kategorie cookies, které používáme",
      blocks: [
        {
          type: "table",
          head: ["Kategorie", "Účel", "Právní základ", "Souhlas"],
          rows: [
            ["Nezbytné", "Přihlášení, bezpečnost, základní funkce aplikace", "Oprávněný zájem / plnění smlouvy", "Není vyžadován"],
            ["Analytické", "Anonymní statistiky návštěvnosti a používání", "Souhlas", "Vyžadován"],
            ["Marketingové", "Personalizace a měření reklamy", "Souhlas", "Vyžadován"],
          ],
        },
      ],
    },
    {
      id: "seznam",
      title: "3. Konkrétní cookies a úložiště",
      blocks: [
        {
          type: "table",
          head: ["Název", "Kategorie", "Účel", "Doba"],
          rows: [
            ["sb-* (Supabase)", "Nezbytné", "Autentizace a udržení přihlášení uživatele", "Relace / dle nastavení"],
            ["cookie-consent", "Nezbytné", "Uchování vaší volby souhlasu s cookies", "Trvalé (localStorage)"],
            ["analytické cookies", "Analytické", "Měření návštěvnosti (aktivní pouze se souhlasem)", "Dle nástroje"],
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Doporučení k technické úpravě",
          text: "Současná cookies lišta ukládá volbu pouze do localStorage a nerozlišuje jednotlivé kategorie granulárně. Pro plnou shodu s GDPR/ePrivacy doporučujeme upravit lištu tak, aby analytické a marketingové skripty byly načteny až po udělení konkrétního souhlasu a aby bylo možné souhlas kdykoli odvolat se stejnou snadností, s jakou byl udělen.",
        },
      ],
    },
    {
      id: "sprava",
      title: "4. Jak spravovat souhlas",
      blocks: [
        {
          type: "p",
          text: "Souhlas udělujete prostřednictvím lišty cookies při první návštěvě. Svou volbu můžete kdykoli změnit v nastavení svého prohlížeče (smazáním cookies a obnovením stránky se lišta zobrazí znovu). Nezbytné cookies nelze vypnout, protože bez nich web nefunguje.",
        },
        {
          type: "p",
          text: `Dotazy ke cookies směřujte na [${OPERATOR.emailGdpr}](mailto:${OPERATOR.emailGdpr}).`,
        },
      ],
    },
  ],
};

export default function CookiesPage() {
  return <LegalDocument doc={doc} />;
}
