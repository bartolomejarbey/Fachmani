import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR, OPERATOR_LINE } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Všeobecné obchodní podmínky | Fachmani",
  description:
    "Všeobecné obchodní podmínky platformy Fachmani — práva a povinnosti zákazníků a fachmanů, placené služby, předplatné, peněženka, odstoupení od smlouvy a řešení sporů.",
  alternates: { canonical: "/vop" },
};

const doc: LegalDoc = {
  kicker: "PRÁVNÍ DOKUMENT",
  title: "Všeobecné obchodní podmínky",
  subtitle:
    "Podmínky užívání platformy Fachmani pro zákazníky i poskytovatele služeb (fachmany).",
  version: "2.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Tyto všeobecné obchodní podmínky upravují vztah mezi Provozovatelem platformy Fachmani a jejími uživateli. Platforma je **online tržiště**, které propojuje zákazníky s poskytovateli služeb. **Provozovatel není stranou smlouvy** uzavřené mezi zákazníkem a fachmanem a neodpovídá za její plnění. Prosíme, věnujte podmínkám pozornost — zejména části D obsahuje zvláštní práva spotřebitelů.",
  related: [
    { href: "/gdpr", label: "Ochrana osobních údajů" },
    { href: "/cookies", label: "Cookies" },
    { href: "/reklamace", label: "Reklamační řád" },
    { href: "/pravidla-recenzi", label: "Pravidla recenzí" },
    { href: "/pravidla-obsahu", label: "Pravidla obsahu (DSA)" },
    { href: "/spotrebitel", label: "Informace pro spotřebitele" },
  ],
  sections: [
    {
      id: "uvod",
      title: "1. Úvodní ustanovení a definice",
      blocks: [
        {
          type: "p",
          text: `Tyto všeobecné obchodní podmínky (dále jen „VOP“) vydává společnost ${OPERATOR_LINE}.`,
        },
        {
          type: "p",
          text: "VOP upravují vzájemná práva a povinnosti vznikající v souvislosti s užíváním platformy Fachmani. Užíváním platformy Uživatel potvrzuje, že se s VOP seznámil a souhlasí s nimi.",
        },
        {
          type: "p",
          text: "Pro účely těchto VOP mají níže uvedené pojmy následující význam:",
        },
        {
          type: "list",
          items: [
            "**Platforma** — webová aplikace dostupná na adrese " + OPERATOR.site + " a související služby (dále též „Fachmani“).",
            "**Provozovatel** — společnost " + OPERATOR.name + ", provozovatel Platformy a poskytovatel zprostředkovatelských a hostingových služeb.",
            "**Uživatel** — jakákoli osoba, která užívá Platformu, ať už registrovaná, či nikoli.",
            "**Zákazník** — Uživatel, který prostřednictvím Platformy poptává služby (zadává poptávky).",
            "**Fachman** (Poskytovatel) — Uživatel, který prostřednictvím Platformy nabízí a poskytuje služby (reaguje na poptávky nabídkami).",
            "**Spotřebitel** — fyzická osoba, která při uzavírání a plnění smlouvy s Provozovatelem nejedná v rámci své podnikatelské činnosti ani v rámci samostatného výkonu svého povolání (§ 419 občanského zákoníku).",
            "**Podnikatel** — Uživatel, který jedná v rámci své podnikatelské činnosti, zejména fachman s přiděleným IČO.",
            "**Poptávka** — zadání zákazníka popisující požadovanou službu.",
            "**Nabídka** — reakce fachmana na poptávku obsahující zejména cenu a podmínky.",
            "**Peněženka** — kreditní účet fachmana vedený v rámci Platformy, z něhož se hradí zpoplatněné funkce.",
            "**Občanský zákoník** — zákon č. 89/2012 Sb., občanský zákoník, v platném znění.",
          ],
        },
      ],
    },
    {
      id: "povaha",
      title: "2. Povaha služby — zprostředkování",
      blocks: [
        {
          type: "p",
          text: "Platforma je online tržiště (online platforma), jehož účelem je propojit zákazníky a fachmany a umožnit jim vzájemnou komunikaci a sjednání služby. Provozovatel poskytuje zejména tyto funkce: zadávání poptávek, prohlížení poptávek a zasílání nabídek, vzájemnou komunikaci (chat), profily fachmanů, hodnocení a recenze a doplňkové (zpoplatněné) funkce.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Provozovatel není stranou smlouvy o díle / o poskytnutí služby",
          text: "Smlouva o provedení služby vzniká výhradně mezi zákazníkem a fachmanem. Provozovatel takovou smlouvu nezprostředkovává ve smyslu zastoupení, není její stranou, nezaručuje její uzavření, plnění, kvalitu, termín ani cenu a neodpovídá za případné vady plnění ani za škodu z plnění vzniklou. Provozovatel rovněž není provozovatelem platebního styku mezi zákazníkem a fachmanem.",
        },
        {
          type: "p",
          text: "Provozovatel nevykonává nad obsahem vkládaným uživateli předběžnou kontrolu nad rámec automatizované a namátkové moderace popsané v [Pravidlech obsahu](/pravidla-obsahu). Provozovatel jedná jako poskytovatel hostingových služeb ve smyslu nařízení o digitálních službách (DSA) a zákona č. 480/2004 Sb.",
        },
      ],
    },
    {
      id: "registrace",
      title: "3. Registrace a uživatelský účet",
      blocks: [
        {
          type: "p",
          text: "Pro využití většiny funkcí Platformy je nutná registrace. Uživatel je povinen uvést pravdivé, úplné a aktuální údaje a udržovat je aktuální. Registrovat se mohou pouze osoby starší 18 let s plnou svéprávností; fachman jedná zpravidla v rámci své podnikatelské činnosti.",
        },
        {
          type: "p",
          text: "Uživatel odpovídá za ochranu svých přihlašovacích údajů a za veškerou aktivitu provedenou pod jeho účtem. Podezření na zneužití účtu je povinen neprodleně oznámit Provozovateli.",
        },
        {
          type: "subsection",
          title: "3.1 Ověření fachmana",
          blocks: [
            {
              type: "p",
              text: "Fachman může své údaje ověřit dvěma na sobě nezávislými způsoby:",
            },
            {
              type: "list",
              items: [
                "**Ověření IČO přes ARES** — porovnání zadaného IČO s veřejným registrem ekonomických subjektů (ARES) Ministerstva financí ČR. Provozovatel může ověření periodicky obnovovat.",
                "**Ověření bankovního účtu** — odesláním symbolické platby (zpravidla 1 Kč, resp. náhodné výše v haléřích) s přiděleným variabilním symbolem z podnikatelského účtu fachmana. Tím fachman prokazuje vztah k bankovnímu účtu.",
              ],
            },
            {
              type: "p",
              text: "Označení „ověřeno“ vyjadřuje pouze provedení uvedených kontrol. **Nepředstavuje záruku Provozovatele** za kvalitu, odbornost, oprávnění k podnikání ani za řádné plnění fachmana.",
            },
          ],
        },
        {
          type: "p",
          text: "Provozovatel je oprávněn pozastavit nebo zrušit účet Uživatele, který porušuje VOP, právní předpisy nebo [Pravidla obsahu](/pravidla-obsahu), případně poškozuje ostatní uživatele či Platformu.",
        },
      ],
    },
    {
      id: "zakaznik",
      title: "4. Práva a povinnosti zákazníka",
      blocks: [
        {
          type: "p",
          text: "Zákazník zadává poptávky pravdivě a úplně. Užívání Platformy je pro zákazníky zpravidla bezplatné; některé doplňkové funkce mohou být zpoplatněny (viz čl. 6).",
        },
        {
          type: "subsection",
          title: "4.1 Limity poptávek",
          blocks: [
            {
              type: "p",
              text: "Pro zajištění kvality a prevenci zneužití platí pro zákazníky limity počtu poptávek. Aktuální výše limitů je uvedena v aplikaci a v [Ceníku](/cenik). Orientačně:",
            },
            {
              type: "list",
              items: [
                "Bezplatně lze zadat omezený počet poptávek za den (standardně 1 poptávka denně).",
                "Nad rámec bezplatného limitu lze zadat **další poptávku** za poplatek dle ceníku.",
                "Poptávku lze označit jako **prioritní (urgentní)** — standardně 1× měsíčně zdarma, dále za poplatek dle ceníku. Prioritní poptávka může být fachmanům doručena i formou SMS či push notifikace.",
              ],
            },
          ],
        },
        {
          type: "p",
          text: "Poptávky procházejí automatizovanou moderací. Poptávka, která porušuje právní předpisy nebo Pravidla obsahu, nemusí být zveřejněna nebo může být odstraněna. Neaktivní poptávky mohou po uplynutí stanovené doby automaticky expirovat.",
        },
      ],
    },
    {
      id: "fachman",
      title: "5. Práva a povinnosti fachmana",
      blocks: [
        {
          type: "p",
          text: "Fachman odpovídá za to, že je oprávněn poskytovat nabízené služby (zejména že disponuje příslušným živnostenským či jiným oprávněním), že jeho profil a nabídky jsou pravdivé a že při poskytování služeb dodržuje právní předpisy.",
        },
        {
          type: "p",
          text: "Fachman bere na vědomí, že prostřednictvím Platformy získává osobní údaje zákazníků (kontaktní údaje, popis zakázky) výhradně za účelem sjednání a poskytnutí poptávané služby. Ve vztahu k těmto údajům vystupuje fachman jako **samostatný správce** a je povinen je chránit dle [Zásad zpracování osobních údajů a DPA](/dpa).",
        },
        {
          type: "subsection",
          title: "5.1 Zkušební období (trial)",
          blocks: [
            {
              type: "p",
              text: "Nový fachman v bezplatném režimu může mít k dispozici zkušební období (standardně 2 měsíce) s omezeným počtem nabídek (standardně 10). Po vyčerpání limitu nebo uplynutí zkušebního období může následovat ochranná lhůta (grace period, standardně 7 dní), po jejímž skončení je odesílání nabídek v bezplatném režimu zablokováno do aktivace předplatného. Konkrétní parametry jsou uvedeny v aplikaci a mohou se měnit.",
            },
          ],
        },
        {
          type: "subsection",
          title: "5.2 Kategorie a nabídky",
          blocks: [
            {
              type: "list",
              items: [
                "Počet kategorií, ve kterých může být fachman zařazen, závisí na tarifu (standardně: Free 1, Premium 3, Business neomezeně).",
                "Počet nabídek k jedné poptávce může být omezen (standardně max. 5 nabídek na poptávku).",
                "Telefonní číslo fachmana může být veřejně zobrazeno pouze u placených tarifů; v bezplatném režimu se zpřístupňuje jen v zákonem či těmito VOP předvídaných případech.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "ceny",
      title: "6. Placené služby, peněženka a ceník",
      blocks: [
        {
          type: "p",
          text: "Platforma nabízí fachmanům placené služby. Aktuální ceník je vždy dostupný v aplikaci a na stránce [Ceník](/cenik). Provozovatel je oprávněn ceník měnit; změny se nedotýkají již zaplacených služeb a u předplatného se uplatní až od dalšího zúčtovacího období.",
        },
        {
          type: "callout",
          variant: "legal",
          title: "Ceny a DPH",
          text: "Provozovatel **není plátcem DPH** (ověřeno v registru plátců DPH). Ceny placených služeb uváděné v aplikaci a v Ceníku jsou proto **konečné** a nepřipočítává se k nim DPH. Stane-li se Provozovatel plátcem DPH, bude to u cen příslušně vyznačeno.",
        },
        {
          type: "subsection",
          title: "6.1 Předplatné (Premium / Business)",
          blocks: [
            {
              type: "p",
              text: "Předplatné poskytuje fachmanovi rozšířené funkce (zejména neomezené nabídky, více kategorií, zvýraznění profilu). Předplatné se sjednává na zvolené období (měsíční / čtvrtletní) a je-li tak nastaveno, **automaticky se obnovuje** a opakovaně účtuje na konci každého období, dokud jej fachman nevypoví.",
            },
            {
              type: "p",
              text: "Výpověď předplatného je možná kdykoli v nastavení účtu nebo na [info@fachmani.org](mailto:info@fachmani.org); účinkuje ke konci předplaceného období (do té doby zůstávají funkce aktivní). Již uhrazené předplatné se nevrací s výjimkou zákonného práva na odstoupení dle části D.",
            },
          ],
        },
        {
          type: "subsection",
          title: "6.2 Kredity v peněžence a jednorázové funkce",
          blocks: [
            {
              type: "p",
              text: "Fachman si může do Peněženky dobít kredit a z něj hradit jednorázové funkce. Orientační přehled (přesné ceny dle ceníku):",
            },
            {
              type: "table",
              head: ["Funkce", "Popis", "Orientační cena"],
              rows: [
                ["Odeslání nabídky", "Zpoplatněné odeslání nabídky nad rámec tarifu", "29 Kč"],
                ["Zvýraznění profilu (7 dní)", "Přednostní zobrazení profilu fachmana", "99 Kč"],
                ["Zvýraznění v Feedu (1 den)", "Zvýraznění příspěvku v Feedu", "49 Kč"],
                ["Premium odznak (30 dní)", "Vizuální odznak u profilu", "199 Kč"],
                ["Další poptávka (zákazník)", "Poptávka nad denní limit", "50 Kč"],
                ["Prioritní poptávka (zákazník)", "Označení poptávky jako urgentní", "100 Kč"],
              ],
            },
            {
              type: "p",
              text: "Kredit v Peněžence představuje předplacenou protihodnotu za budoucí čerpání digitálních služeb Platformy, nikoli elektronické peníze ani vklad. Kredit nelze směnit zpět na peníze ani vyplatit, s výjimkou zákonných nároků (zejména práva spotřebitele na odstoupení dle části D nebo při zrušení účtu Provozovatelem bez zavinění fachmana).",
            },
          ],
        },
        {
          type: "subsection",
          title: "6.3 Platby a fakturace",
          blocks: [
            {
              type: "p",
              text: `Platby (dobití kreditu, předplatné, jednorázové funkce) jsou zpracovávány prostřednictvím platební brány ${OPERATOR.paymentProvider}. Platební údaje zadává Uživatel přímo u poskytovatele platební brány; Provozovatel nemá přístup k údajům platební karty.`,
            },
            {
              type: "p",
              text: "Online platby pro nás zajišťuje platební brána Comgate. Poskytovatel služby, společnost Comgate a.s. je licencovaná Platební instituce působící pod dohledem České národní banky. Platby probíhající skrze platební bránu jsou plně zabezpečeny a veškeré informace jsou šifrovány. Další informace a kontakty na [www.comgate.eu](https://www.comgate.eu).",
            },
            {
              type: "p",
              text: "Provozovatel vystaví fachmanovi daňový doklad (fakturu) k uhrazeným platbám a zpřístupní jej v aplikaci nebo zašle e-mailem.",
            },
          ],
        },
      ],
    },
    {
      id: "obsah",
      title: "7. Obsah uživatelů a licence",
      blocks: [
        {
          type: "p",
          text: "Uživatel odpovídá za veškerý obsah, který na Platformu vloží (texty, fotografie, profil, recenze, příspěvky ve Feedu, zprávy). Vložením obsahu Uživatel prohlašuje, že je oprávněn jej zveřejnit a že obsah neporušuje práva třetích osob ani právní předpisy.",
        },
        {
          type: "p",
          text: "Uživatel uděluje Provozovateli bezúplatnou, nevýhradní licenci k užití vloženého obsahu v rozsahu nezbytném pro provoz, zobrazení a propagaci Platformy. Pravidla přípustného obsahu a postup při oznámení nezákonného obsahu upravují [Pravidla obsahu (DSA)](/pravidla-obsahu); pravidla pro hodnocení upravují [Pravidla recenzí](/pravidla-recenzi).",
        },
      ],
    },
    {
      id: "odpovednost",
      title: "8. Odpovědnost a její omezení",
      blocks: [
        {
          type: "p",
          text: "Provozovatel poskytuje Platformu „tak, jak je“ a vyvíjí přiměřené úsilí o její dostupnost a bezpečnost. Provozovatel zejména neodpovídá za:",
        },
        {
          type: "list",
          items: [
            "kvalitu, rozsah, termín, cenu a řádné poskytnutí služeb sjednaných mezi zákazníkem a fachmanem;",
            "škodu vzniklou v souvislosti se službami fachmanů či jednáním uživatelů;",
            "obsah vložený uživateli a jeho pravdivost;",
            "dočasnou nedostupnost Platformy způsobenou údržbou, vyšší mocí nebo výpadky služeb třetích stran (hosting, platební brána, e-mail, SMS).",
          ],
        },
        {
          type: "p",
          text: "Vůči Uživatelům-podnikatelům se náhrada škody způsobené Provozovatelem omezuje na předvídatelnou škodu a celkově na výši plateb, které dotčený Uživatel Provozovateli uhradil za posledních 12 měsíců. Toto omezení se neuplatní v případě úmyslu, hrubé nedbalosti, újmy na zdraví ani tam, kde to zákon zakazuje. **Práva spotřebitele dle zákona tímto nejsou dotčena.**",
        },
      ],
    },
    {
      id: "reklamace",
      title: "9. Reklamace a řešení sporů",
      blocks: [
        {
          type: "p",
          text: "Vady placených služeb Platformy lze reklamovat postupem dle [Reklamačního řádu](/reklamace), zpravidla na [info@fachmani.org](mailto:info@fachmani.org). Reklamace bude vyřízena bez zbytečného odkladu, nejpozději do 30 dnů.",
        },
        {
          type: "p",
          text: "Spory mezi zákazníkem a fachmanem ze smlouvy o službě řeší tyto strany přímo; Provozovatel může na žádost poskytnout přiměřenou součinnost. Mimosoudní řešení spotřebitelských sporů a další informace pro spotřebitele upravuje stránka [Informace pro spotřebitele](/spotrebitel).",
        },
      ],
    },
    {
      id: "ukonceni",
      title: "10. Trvání a ukončení",
      blocks: [
        {
          type: "p",
          text: "Uživatel může kdykoli zrušit svůj účet v nastavení profilu nebo na [info@fachmani.org](mailto:info@fachmani.org). Zrušením účtu nezanikají závazky vzniklé před jeho zrušením.",
        },
        {
          type: "p",
          text: "Provozovatel může smluvní vztah ukončit a účet zrušit, poruší-li Uživatel podstatným způsobem VOP nebo právní předpisy. Při zrušení účtu z důvodu na straně Uživatele nemá Uživatel nárok na vrácení uhrazených poplatků ani nevyčerpaného kreditu, nestanoví-li zákon jinak.",
        },
      ],
    },
    {
      id: "spotrebitel",
      title: "D. Zvláštní ustanovení pro spotřebitele",
      blocks: [
        {
          type: "callout",
          variant: "info",
          title: "Tato část se uplatní, jste-li spotřebitel",
          text: "Jednáte-li jako spotřebitel (typicky fachman — fyzická osoba nepodnikatel — který hradí placené služby Platformy), máte níže uvedená zákonná práva. Vůči Uživatelům-podnikatelům (B2B) se tato část neuplatní.",
        },
        {
          type: "subsection",
          title: "D.1 Právo odstoupit od smlouvy do 14 dnů",
          blocks: [
            {
              type: "p",
              text: "Spotřebitel má právo odstoupit od smlouvy uzavřené distančním způsobem (předplatné, dobití kreditu, placená funkce) bez udání důvodu ve lhůtě 14 dnů ode dne uzavření smlouvy (§ 1829 občanského zákoníku). Pro odstoupení lze využít [vzorový formulář](/spotrebitel) nebo zaslat oznámení na [info@fachmani.org](mailto:info@fachmani.org).",
            },
          ],
        },
        {
          type: "subsection",
          title: "D.2 Zánik práva na odstoupení u ihned poskytnutého digitálního obsahu / služby",
          blocks: [
            {
              type: "callout",
              variant: "warning",
              title: "Důležité upozornění před nákupem",
              text: "Žádáte-li o zahájení poskytování digitální služby (např. okamžitou aktivaci předplatného, čerpání kreditu, odeslání placené nabídky) před uplynutím 14denní lhůty, udělujete tím výslovný souhlas se zahájením plnění a berete na vědomí, že okamžikem úplného poskytnutí služby ztrácíte právo na odstoupení (§ 1837 občanského zákoníku). Odstoupíte-li v průběhu plnění, uhradíte poměrnou část ceny za plnění poskytnuté do okamžiku odstoupení (§ 1834 občanského zákoníku) a zbývající poměrná část vám bude vrácena.",
            },
          ],
        },
        {
          type: "subsection",
          title: "D.3 Vrácení plateb",
          blocks: [
            {
              type: "p",
              text: "Odstoupí-li spotřebitel platně od smlouvy, vrátí Provozovatel přijaté peněžní prostředky bez zbytečného odkladu, nejpozději do 14 dnů, stejným způsobem, jakým je přijal, nedohodnou-li se strany jinak.",
            },
          ],
        },
      ],
    },
    {
      id: "zaverecna",
      title: "11. Změny VOP a závěrečná ustanovení",
      blocks: [
        {
          type: "p",
          text: "Tyto VOP a vztahy jimi neupravené se řídí právním řádem České republiky, zejména občanským zákoníkem. Je-li Uživatel spotřebitelem, nejsou tímto dotčena ustanovení právních předpisů na ochranu spotřebitele.",
        },
        {
          type: "p",
          text: "Provozovatel je oprávněn VOP měnit. O podstatné změně bude Uživatel informován e-mailem nebo oznámením v aplikaci nejméně 14 dnů předem. Pokračováním v užívání Platformy po nabytí účinnosti změny Uživatel se změnou souhlasí; nesouhlasí-li, je oprávněn účet zrušit.",
        },
        {
          type: "p",
          text: `Kontakt na Provozovatele: ${OPERATOR.name}, ${OPERATOR.address}, e-mail [${OPERATOR.email}](mailto:${OPERATOR.email}), tel. ${OPERATOR.phone}.`,
        },
        {
          type: "p",
          text: "Tyto VOP nabývají účinnosti dne 1. června 2026.",
        },
      ],
    },
  ],
};

export default function VOPPage() {
  return <LegalDocument doc={doc} />;
}
