import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Pravidla recenzí a hodnocení | Fachmani",
  description:
    "Jak na platformě Fachmani vznikají recenze, jak ověřujeme jejich pravost a jaká pravidla pro hodnocení platí.",
  alternates: { canonical: "/pravidla-recenzi" },
};

const doc: LegalDoc = {
  kicker: "PRÁVNÍ DOKUMENT",
  title: "Pravidla recenzí a hodnocení",
  subtitle: "Transparentní pravidla pro vznik, ověřování a moderaci recenzí na platformě Fachmani.",
  version: "1.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Recenze pomáhají uživatelům rozhodovat se. Aby byly důvěryhodné, zveřejňujeme — v souladu s požadavky na ochranu spotřebitele (tzv. směrnice Omnibus, zákon č. 634/1992 Sb.) — jak recenze vznikají a jak ověřujeme, že pocházejí od skutečných zákazníků.",
  related: [
    { href: "/vop", label: "Obchodní podmínky" },
    { href: "/pravidla-obsahu", label: "Pravidla obsahu (DSA)" },
  ],
  sections: [
    {
      id: "vznik",
      title: "1. Kdo a kdy může recenzi napsat",
      blocks: [
        {
          type: "p",
          text: "Recenze na Platformě jsou **oboustranné**: zákazník hodnotí fachmana a fachman může hodnotit zákazníka. Hodnocení probíhá ve více kritériích (např. kvalita, komunikace, cena / spolehlivost) a z nich se odvozuje celkové hodnocení.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Ověřování pravosti recenzí",
          text: "Recenzi lze vložit až poté, co mezi zákazníkem a fachmanem proběhla zakázka navázaná na konkrétní poptávku a nabídku, a její dokončení bylo v aplikaci potvrzeno (workflow „potvrzení dokončení zakázky“). Tím zajišťujeme, že recenze pochází od osoby, která službu skutečně poptala / poskytla. Ke každé dvojici zakázka–protistrana lze vložit zpravidla jen jednu recenzi.",
        },
      ],
    },
    {
      id: "pravidla",
      title: "2. Pravidla obsahu recenzí",
      blocks: [
        {
          type: "p",
          text: "Recenze musí vycházet ze skutečné zkušenosti a být věcná. Zakázané jsou zejména:",
        },
        {
          type: "list",
          items: [
            "smyšlené nebo zmanipulované recenze (vlastní, na objednávku či výměnou za protiplnění);",
            "recenze třetích osob, které službu nevyužily;",
            "urážlivý, vulgární, diskriminační nebo nezákonný obsah;",
            "osobní údaje třetích osob nad rámec nezbytný k popisu zkušenosti;",
            "obsah nesouvisející se službou (spam, reklama).",
          ],
        },
        {
          type: "p",
          text: "Provozovatel **neupravuje text recenzí** za účelem zkreslení jejich vyznění a nezveřejňuje pouze pozitivní recenze. Celkové hodnocení vychází ze všech ověřených recenzí.",
        },
      ],
    },
    {
      id: "moderace",
      title: "3. Moderace, úprava a mazání",
      blocks: [
        {
          type: "p",
          text: "Recenze procházejí automatizovanou a namátkovou kontrolou. Provozovatel je oprávněn odstranit recenzi, která porušuje tato pravidla nebo [Pravidla obsahu](/pravidla-obsahu). O odstranění obsahu rozhoduje Provozovatel s možností odůvodnění a odvolání dle Pravidel obsahu.",
        },
        {
          type: "p",
          text: `Domníváte-li se, že je některá recenze nepravdivá nebo porušuje pravidla, oznamte to na [${OPERATOR.email}](mailto:${OPERATOR.email}) s odkazem na konkrétní recenzi.`,
        },
      ],
    },
  ],
};

export default function PravidlaRecenziPage() {
  return <LegalDocument doc={doc} />;
}
