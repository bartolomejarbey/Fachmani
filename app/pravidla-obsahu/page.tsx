import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Pravidla obsahu a moderace (DSA) | Fachmani",
  description:
    "Pravidla přípustného obsahu, postup oznamování nezákonného obsahu (notice & action) a moderace dle nařízení o digitálních službách (DSA).",
  alternates: { canonical: "/pravidla-obsahu" },
};

const doc: LegalDoc = {
  kicker: "PRÁVNÍ DOKUMENT",
  title: "Pravidla obsahu a moderace (DSA)",
  subtitle:
    "Pravidla přípustného obsahu a postup oznamování nezákonného obsahu dle nařízení (EU) 2022/2065 (DSA).",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Fachmani je online platforma umožňující ukládání a zveřejňování obsahu uživatelů. Jako poskytovatel hostingových služeb dle nařízení o digitálních službách (DSA) a zákona č. 480/2004 Sb. zde transparentně popisujeme pravidla obsahu, kontaktní místo a postup, jak nahlásit nezákonný obsah.",
  related: [
    { href: "/vop", label: "Obchodní podmínky" },
    { href: "/pravidla-recenzi", label: "Pravidla recenzí" },
    { href: "/gdpr", label: "Ochrana osobních údajů" },
  ],
  sections: [
    {
      id: "kontakt",
      title: "1. Jednotné kontaktní místo",
      blocks: [
        {
          type: "p",
          text: `Kontaktním místem pro orgány i uživatele ve věcech moderace obsahu dle DSA je e-mail [${OPERATOR.email}](mailto:${OPERATOR.email}). Komunikovat lze v českém jazyce.`,
        },
      ],
    },
    {
      id: "zakazany",
      title: "2. Zakázaný a nepřípustný obsah",
      blocks: [
        {
          type: "p",
          text: "Na Platformu je zakázáno vkládat obsah, který je nezákonný nebo porušuje tato pravidla, zejména:",
        },
        {
          type: "list",
          items: [
            "obsah nabádající k násilí, nenávisti či diskriminaci, výhrůžky;",
            "obsah porušující práva duševního vlastnictví třetích osob;",
            "podvodný, klamavý nebo zavádějící obsah a spam;",
            "nezákonné nabídky zboží a služeb;",
            "osobní údaje třetích osob bez právního základu;",
            "vulgární, urážlivý nebo sexuálně explicitní obsah;",
            "obsah ohrožující bezpečnost Platformy (malware, odkazy na škodlivý obsah).",
          ],
        },
      ],
    },
    {
      id: "oznameni",
      title: "3. Oznámení nezákonného obsahu (notice & action)",
      blocks: [
        {
          type: "p",
          text: `Kdokoli může oznámit obsah, který považuje za nezákonný, na [${OPERATOR.email}](mailto:${OPERATOR.email}). Aby mohlo být oznámení řádně posouzeno, uveďte prosím:`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "odůvodnění, proč je obsah nezákonný;",
            "přesné umístění obsahu (URL / identifikace);",
            "vaše jméno a kontaktní e-mail (s výjimkou oznámení trestných činů proti životu a bezpečnosti);",
            "prohlášení o dobré víře, že údaje v oznámení jsou správné a úplné.",
          ],
        },
        {
          type: "p",
          text: "Přijetí oznámení potvrdíme a vyřídíme jej včas, s náležitou péčí, objektivně a nesvévolně. O svém rozhodnutí informujeme oznamovatele i dotčeného uživatele.",
        },
      ],
    },
    {
      id: "moderace",
      title: "4. Moderace a opatření",
      blocks: [
        {
          type: "p",
          text: "Provozovatel používá kombinaci automatizované moderace (vč. AI nástrojů) a lidského posouzení. Při porušení pravidel může Provozovatel přijmout zejména tato opatření: znepřístupnění nebo odstranění obsahu, omezení viditelnosti, pozastavení či zrušení účtu, pozastavení zpracování oznámení od osob opakovaně zneužívajících systém.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Odůvodnění a odvolání",
          text: "Omezí-li Provozovatel obsah konkrétního uživatele, poskytne mu jasné a konkrétní odůvodnění. Uživatel má právo se proti rozhodnutí odvolat odpovědí na oznámení o opatření; odvolání posoudíme pod dohledem člověka. Tím nejsou dotčeny soudní prostředky ochrany.",
        },
      ],
    },
    {
      id: "transparentnost",
      title: "5. Transparentnost",
      blocks: [
        {
          type: "p",
          text: "Provozovatel vede evidenci přijatých oznámení a přijatých opatření. V rozsahu vyžadovaném DSA může Provozovatel zveřejňovat souhrnné informace o moderaci obsahu. Tato pravidla mohou být aktualizována v návaznosti na vývoj právní úpravy.",
        },
      ],
    },
  ],
};

export default function PravidlaObsahuPage() {
  return <LegalDocument doc={doc} />;
}
