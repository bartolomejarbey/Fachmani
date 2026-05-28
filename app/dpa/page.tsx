import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR, OPERATOR_LINE } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Zpracování osobních údajů a DPA | Fachmani",
  description:
    "Ujednání o zpracování a předávání osobních údajů — seznam subzpracovatelů a vztah mezi provozovatelem a fachmanem ohledně údajů zákazníků.",
  alternates: { canonical: "/dpa" },
};

const doc: LegalDoc = {
  kicker: "⚖️ ZPRACOVÁNÍ ÚDAJŮ",
  title: "Zpracování osobních údajů a DPA",
  subtitle:
    "Smluvní ujednání o ochraně osobních údajů dle čl. 26 a 28 GDPR — subzpracovatelé a vztah provozovatel ↔ fachman.",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Tento dokument doplňuje [Zásady ochrany osobních údajů](/gdpr) o smluvní rámec zpracování. Vymezuje role jednotlivých stran, seznam subzpracovatelů Provozovatele a povinnosti fachmana při nakládání s údaji zákazníků, které získá v souvislosti se zakázkou.",
  related: [
    { href: "/gdpr", label: "Ochrana osobních údajů" },
    { href: "/vop", label: "Obchodní podmínky" },
    { href: "/pravidla-obsahu", label: "Pravidla obsahu (DSA)" },
  ],
  sections: [
    {
      id: "role",
      title: "1. Vymezení rolí",
      blocks: [
        { type: "p", text: `Správcem osobních údajů zpracovávaných na Platformě je ${OPERATOR_LINE}.` },
        {
          type: "list",
          items: [
            "Ve vztahu k údajům uživatelů Platformy je **Provozovatel správcem** a využívá **subzpracovatele** (čl. 28 GDPR) uvedené v čl. 2.",
            "Předá-li Provozovatel fachmanovi kontaktní a další údaje zákazníka za účelem sjednání a realizace zakázky, vystupují **Provozovatel a fachman jako samostatní (nezávislí) správci** každý pro své vlastní účely — viz čl. 3.",
          ],
        },
        {
          type: "callout",
          variant: "legal",
          text: "Model „samostatných správců“ odpovídá faktickému fungování tržiště (fachman určuje účel a prostředky zpracování dat zákazníka pro vlastní zakázku). Pokud by měl Provozovatel pro některé činnosti vystupovat jako zpracovatel fachmana (čl. 28) nebo jako společný správce (čl. 26), je třeba uzavřít odpovídající samostatnou smlouvu. Tuto kvalifikaci doporučujeme potvrdit s advokátem.",
        },
      ],
    },
    {
      id: "subzpracovatele",
      title: "2. Seznam subzpracovatelů Provozovatele",
      blocks: [
        {
          type: "p",
          text: "Provozovatel zapojuje do zpracování níže uvedené subzpracovatele, kteří poskytují dostatečné záruky dle čl. 28 GDPR a jsou vázáni smlouvou o zpracování. Aktuální seznam je rovněž součástí [Zásad ochrany osobních údajů](/gdpr).",
        },
        {
          type: "table",
          head: ["Subzpracovatel", "Činnost", "Umístění / záruky"],
          rows: [
            ["Supabase, Inc.", "Databáze, autentizace, úložiště", "EU / USA — SCC / DPF"],
            ["Vercel, Inc.", "Hosting aplikace", "EU / USA — SCC / DPF"],
            ["OpenAI", "AI funkce a moderace", "EU / USA — SCC / DPF"],
            ["Resend", "Transakční e-maily a newsletter", "USA — SCC / DPF"],
            ["SMSbrana / Twilio", "SMS notifikace", "ČR / USA — SCC / DPF"],
            [OPERATOR.paymentProvider, "Platební brána", "ČR / EU"],
          ],
        },
        {
          type: "p",
          text: "O zamýšlené změně subzpracovatelů (přidání či nahrazení) Provozovatel informuje předem na Platformě nebo e-mailem a umožní vznést námitku.",
        },
      ],
    },
    {
      id: "fachman",
      title: "3. Ujednání o předávání údajů zákazníka fachmanovi",
      blocks: [
        {
          type: "p",
          text: "Reaguje-li zákazník na nabídku fachmana, zpřístupní Provozovatel fachmanovi osobní údaje zákazníka v rozsahu nezbytném pro kontakt a realizaci zakázky (zejména jméno, kontaktní údaje a popis poptávky). Fachman se zavazuje, že:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "zpracuje údaje zákazníka **výhradně za účelem** sjednání a poskytnutí poptávané služby;",
            "nebude údaje využívat k nevyžádanému marketingu ani je předávat třetím osobám bez právního základu;",
            "přijme přiměřená technická a organizační opatření k jejich zabezpečení;",
            "splní vůči zákazníkovi vlastní informační povinnost dle čl. 13/14 GDPR jakožto samostatný správce;",
            "uchová údaje jen po dobu nezbytně nutnou a v souladu s právními předpisy;",
            "bez zbytečného odkladu oznámí Provozovateli porušení zabezpečení, které se týká i Platformy.",
          ],
        },
        {
          type: "callout",
          variant: "warning",
          text: "Porušení těchto povinností může vést k pozastavení či zrušení účtu fachmana a k odpovědnosti fachmana za vzniklou újmu, vč. případných sankcí dozorového úřadu.",
        },
      ],
    },
    {
      id: "bezpecnost",
      title: "4. Bezpečnost, incidenty a součinnost",
      blocks: [
        {
          type: "p",
          text: "Provozovatel i jeho subzpracovatelé uplatňují opatření dle čl. 32 GDPR (šifrování přenosu, řízení přístupů, oddělení prostředí). Porušení zabezpečení osobních údajů Provozovatel řeší dle čl. 33–34 GDPR a v zákonných případech jej ohlásí Úřadu pro ochranu osobních údajů a dotčeným osobám.",
        },
        {
          type: "p",
          text: `Kontaktní bod pro tato ujednání: [${OPERATOR.emailDpo}](mailto:${OPERATOR.emailDpo}) nebo [${OPERATOR.emailGdpr}](mailto:${OPERATOR.emailGdpr}).`,
        },
      ],
    },
  ],
};

export default function DPAPage() {
  return <LegalDocument doc={doc} />;
}
