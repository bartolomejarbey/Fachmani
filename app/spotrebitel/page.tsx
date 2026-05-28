import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Informace pro spotřebitele | Fachmani",
  description:
    "Předsmluvní informace, právo na odstoupení od smlouvy, vzorový formulář a mimosoudní řešení spotřebitelských sporů (ČOI).",
  alternates: { canonical: "/spotrebitel" },
};

const doc: LegalDoc = {
  kicker: "PRO SPOTŘEBITELE",
  title: "Informace pro spotřebitele",
  subtitle:
    "Vaše práva při uzavírání smlouvy na dálku, odstoupení od smlouvy a mimosoudní řešení sporů.",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Tyto informace se uplatní, jednáte-li jako spotřebitel (fyzická osoba mimo svou podnikatelskou činnost). Doplňují [Všeobecné obchodní podmínky](/vop), zejména jejich část D.",
  related: [
    { href: "/vop", label: "Obchodní podmínky (část D)" },
    { href: "/reklamace", label: "Reklamační řád" },
    { href: "/kontakt", label: "Kontakt" },
  ],
  sections: [
    {
      id: "predsmluvni",
      title: "1. Předsmluvní informace",
      blocks: [
        {
          type: "list",
          items: [
            `**Poskytovatel:** ${OPERATOR.name}, IČO ${OPERATOR.ico}, ${OPERATOR.address}.`,
            `**Kontakt:** [${OPERATOR.email}](mailto:${OPERATOR.email}), tel. ${OPERATOR.phone}.`,
            "**Předmět plnění:** digitální služby Platformy (předplatné, kredit, zpoplatněné funkce) popsané ve VOP a v [Ceníku](/cenik).",
            "**Cena:** uvedena v aplikaci a v Ceníku včetně všech daní; bez dalších nákladů na prostředky komunikace na dálku.",
            "**Způsob platby a dodání:** online přes platební bránu; služba je zpřístupněna elektronicky.",
            "**Doba trvání a obnovení:** předplatné se sjednává na zvolené období a může se automaticky obnovovat až do výpovědi.",
          ],
        },
      ],
    },
    {
      id: "odstoupeni",
      title: "2. Právo odstoupit od smlouvy do 14 dnů",
      blocks: [
        {
          type: "p",
          text: "Máte právo odstoupit od smlouvy uzavřené na dálku bez udání důvodu ve lhůtě 14 dnů ode dne jejího uzavření (§ 1829 občanského zákoníku). Odstoupení stačí odeslat v poslední den lhůty.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Pozor — zahájení plnění před koncem lhůty",
          text: "Požádáte-li výslovně o zahájení poskytování služby před uplynutím 14denní lhůty, platí: (a) po **úplném** poskytnutí služby právo na odstoupení zaniká, pokud jste byli předem poučeni o ztrátě tohoto práva a tuto ztrátu jste vzali na vědomí (§ 1837 občanského zákoníku); (b) odstoupíte-li v průběhu plnění, uhradíte **poměrnou část** ceny za plnění poskytnuté do okamžiku odstoupení (§ 1834 občanského zákoníku).",
        },
        {
          type: "p",
          text: "Jde-li o digitální obsah nedodávaný na hmotném nosiči (např. okamžité zpřístupnění funkce), právo na odstoupení zaniká, jen pokud plnění začalo s vaším výslovným souhlasem, byli jste poučeni o zániku práva a obdrželi jste o tom potvrzení (§ 1824a a § 1837 občanského zákoníku).",
        },
      ],
    },
    {
      id: "formular",
      title: "3. Vzorový formulář pro odstoupení",
      blocks: [
        {
          type: "p",
          text: `Tento formulář vyplňte a zašlete pouze v případě, že chcete odstoupit od smlouvy. Zašlete jej na [${OPERATOR.email}](mailto:${OPERATOR.email}).`,
        },
        {
          type: "callout",
          variant: "legal",
          text: `Adresát: ${OPERATOR.name}, ${OPERATOR.address}, e-mail ${OPERATOR.email}. — Oznamuji, že tímto odstupuji od smlouvy o poskytnutí těchto služeb: ____________. Datum objednání / uzavření: ____________. Jméno a příjmení spotřebitele: ____________. Adresa: ____________. E-mail účtu: ____________. Datum: ____________. (Podpis, je-li formulář zasílán v listinné podobě.)`,
        },
      ],
    },
    {
      id: "adr",
      title: "4. Mimosoudní řešení spotřebitelských sporů",
      blocks: [
        {
          type: "p",
          text: "Vznikne-li mezi vámi a Provozovatelem spotřebitelský spor, který se nepodaří vyřešit dohodou, máte právo na jeho mimosoudní řešení. Subjektem mimosoudního řešení spotřebitelských sporů je:",
        },
        {
          type: "list",
          items: [
            "**Česká obchodní inspekce (ČOI)**, Ústřední inspektorát — oddělení ADR, Gorazdova 1969/24, 120 00 Praha 2, web [coi.gov.cz](https://coi.gov.cz), informace o ADR na [coi.gov.cz/informace-o-adr](https://coi.gov.cz/informace-o-adr/).",
          ],
        },
        {
          type: "p",
          text: "Dozor nad dodržováním předpisů na ochranu spotřebitele vykonává rovněž Česká obchodní inspekce. Návrh na zahájení mimosoudního řešení lze podat nejpozději do 1 roku ode dne prvního uplatnění práva u Provozovatele.",
        },
      ],
    },
  ],
};

export default function SpotrebitelPage() {
  return <LegalDocument doc={doc} />;
}
