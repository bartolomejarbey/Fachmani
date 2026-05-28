import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Reklamační řád | Fachmani",
  description:
    "Postup pro reklamaci placených služeb platformy Fachmani — práva z vadného plnění, lhůty a způsob uplatnění.",
  alternates: { canonical: "/reklamace" },
};

const doc: LegalDoc = {
  kicker: "PRÁVNÍ DOKUMENT",
  title: "Reklamační řád",
  subtitle: "Postup pro uplatnění práv z vadného plnění u placených služeb platformy Fachmani.",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Tento reklamační řád se vztahuje na **placené (digitální) služby Platformy** poskytované Provozovatelem (předplatné, kredity, zpoplatněné funkce). **Netýká se** služeb sjednaných mezi zákazníkem a fachmanem — ty reklamuje zákazník přímo u fachmana.",
  related: [
    { href: "/vop", label: "Obchodní podmínky" },
    { href: "/spotrebitel", label: "Informace pro spotřebitele" },
    { href: "/kontakt", label: "Kontakt" },
  ],
  sections: [
    {
      id: "rozsah",
      title: "1. Rozsah a odpovědnost za vady",
      blocks: [
        {
          type: "p",
          text: "Provozovatel odpovídá za to, že placená digitální služba je po dobu jejího poskytování bez vad a má vlastnosti, které byly ujednány nebo které lze rozumně očekávat (§ 2389a a násl. občanského zákoníku o digitálním obsahu a službách).",
        },
        {
          type: "callout",
          variant: "info",
          text: "Vadou není dočasná nedostupnost Platformy z důvodu plánované údržby, vyšší moci nebo výpadku služeb třetích stran, ani nedosažení výsledku závislého na chování jiných uživatelů (např. že fachman neobdrží na nabídku reakci).",
        },
      ],
    },
    {
      id: "uplatneni",
      title: "2. Jak reklamaci uplatnit",
      blocks: [
        {
          type: "p",
          text: `Reklamaci uplatněte bez zbytečného odkladu po zjištění vady e-mailem na [${OPERATOR.email}](mailto:${OPERATOR.email}) nebo písemně na adresu sídla ${OPERATOR.address}.`,
        },
        {
          type: "p",
          text: "V reklamaci prosím uveďte:",
        },
        {
          type: "list",
          items: [
            "identifikaci účtu (e-mail) a reklamované služby;",
            "popis vady a kdy se projevila;",
            "čím se domáháte vyřízení (oprava, sleva, vrácení ceny).",
          ],
        },
      ],
    },
    {
      id: "lhuty",
      title: "3. Vyřízení reklamace a lhůty",
      blocks: [
        {
          type: "p",
          text: "Je-li reklamující spotřebitelem, vydá Provozovatel písemné potvrzení o uplatnění reklamace a o jejím vyřízení. Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do **30 dnů** ode dne uplatnění, nedohodneme-li se na delší lhůtě.",
        },
        {
          type: "p",
          text: "Při oprávněné reklamaci máte právo zejména na odstranění vady, přiměřenou slevu, případně na vrácení ceny za neposkytnutou část služby. Náklady účelně vynaložené na uplatnění oprávněné reklamace hradí Provozovatel.",
        },
      ],
    },
    {
      id: "spory",
      title: "4. Mimosoudní řešení sporů",
      blocks: [
        {
          type: "p",
          text: "Nebudete-li s vyřízením reklamace spokojeni jako spotřebitel, máte právo na mimosoudní řešení sporu u České obchodní inspekce (viz [Informace pro spotřebitele](/spotrebitel)).",
        },
      ],
    },
  ],
};

export default function ReklamacePage() {
  return <LegalDocument doc={doc} />;
}
