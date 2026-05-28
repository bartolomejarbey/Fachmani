import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import { OPERATOR, OPERATOR_LINE } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů | Fachmani",
  description:
    "Jak platforma Fachmani zpracovává osobní údaje — účely, právní základy, příjemci a zpracovatelé, předávání do třetích zemí, zpracování AI, data z rejstříku ARES a vaše práva dle GDPR.",
  alternates: { canonical: "/gdpr" },
};

const doc: LegalDoc = {
  kicker: "🔒 OCHRANA SOUKROMÍ",
  title: "Zásady ochrany osobních údajů",
  subtitle:
    "Informace o zpracování osobních údajů dle nařízení (EU) 2016/679 (GDPR) a zákona č. 110/2019 Sb.",
  version: "2.0",
  effectiveDate: "1. června 2026",
  updatedDate: "28. května 2026",
  intro:
    "Vaše soukromí je pro nás prioritou. Zpracováváme jen údaje nezbytné pro fungování platformy, **neprodáváme** je třetím stranám a dáváme vám plnou kontrolu nad vašimi údaji. Tyto zásady vysvětlují, jaké údaje zpracováváme, proč, na jakém právním základě, komu je předáváme a jaká máte práva.",
  related: [
    { href: "/vop", label: "Obchodní podmínky" },
    { href: "/cookies", label: "Cookies" },
    { href: "/dpa", label: "Zpracování OÚ / DPA" },
    { href: "/gdpr/opt-out", label: "Námitka proti ghost profilu (ARES)" },
  ],
  sections: [
    {
      id: "spravce",
      title: "1. Správce osobních údajů",
      blocks: [
        { type: "p", text: `Správcem osobních údajů je ${OPERATOR_LINE}.` },
        {
          type: "p",
          text: `Kontakt ve věcech ochrany osobních údajů: [${OPERATOR.emailGdpr}](mailto:${OPERATOR.emailGdpr}), případně pověřenec pro ochranu osobních údajů: [${OPERATOR.emailDpo}](mailto:${OPERATOR.emailDpo}).`,
        },
        {
          type: "callout",
          variant: "legal",
          text: "Jmenování pověřence pro ochranu osobních údajů (DPO) není pro Provozovatele povinné ze zákona; je-li uveden, slouží jako kontaktní bod. Před spuštěním ověřte, zda chcete DPO formálně jmenovat.",
        },
      ],
    },
    {
      id: "subjekty",
      title: "2. Koho se zpracování týká",
      blocks: [
        {
          type: "list",
          items: [
            "**Zákazníci** — registrovaní uživatelé zadávající poptávky.",
            "**Fachmani** — poskytovatelé služeb (zpravidla podnikatelé).",
            "**Návštěvníci** — neregistrovaní uživatelé webu.",
            "**Odběratelé newsletteru.**",
            "**Subjekty z rejstříku ARES** („ghost profily“) — podnikatelské subjekty zobrazené z veřejných dat (viz čl. 7).",
            "**Osoby, které nás kontaktují** (kontaktní formulář, e-mail).",
          ],
        },
      ],
    },
    {
      id: "udaje",
      title: "3. Jaké údaje zpracováváme",
      blocks: [
        {
          type: "list",
          items: [
            "**Identifikační a kontaktní údaje:** jméno a příjmení / název, e-mail, telefon, IČO, sídlo / adresa.",
            "**Přihlašovací údaje:** e-mail a heslo (uložené v podobě bezpečného otisku).",
            "**Údaje o aktivitě:** poptávky, nabídky, zprávy, recenze, příspěvky, transakce.",
            "**Platební údaje:** historie plateb a faktur (údaje platební karty zpracovává přímo platební brána, nemáme k nim přístup).",
            "**Údaje pro ověření:** IČO a data z ARES, údaje o ověřovací platbě z bankovního účtu.",
            "**Technické údaje:** IP adresa (zpravidla v podobě otisku), typ prohlížeče, cookies, identifikátory zařízení pro push notifikace.",
          ],
        },
      ],
    },
    {
      id: "ucely",
      title: "4. Účely a právní základy zpracování",
      blocks: [
        {
          type: "table",
          head: ["Účel", "Právní základ (GDPR)"],
          rows: [
            ["Poskytování platformy, správa účtu, propojení zákazníků a fachmanů", "Plnění smlouvy — čl. 6 odst. 1 písm. b)"],
            ["Zpracování plateb a vedení účetnictví", "Plnění smlouvy a právní povinnost — čl. 6 odst. 1 písm. b) a c)"],
            ["Ověření fachmana (ARES, bankovní ověření)", "Plnění smlouvy a oprávněný zájem — čl. 6 odst. 1 písm. b) a f)"],
            ["Zobrazení veřejných dat z ARES (ghost profily)", "Oprávněný zájem — čl. 6 odst. 1 písm. f)"],
            ["Moderace obsahu, prevence podvodů a zneužití (vč. kontroly insolvence ISIR)", "Oprávněný zájem a právní povinnost — čl. 6 odst. 1 písm. f) a c)"],
            ["Provozní notifikace (e-mail, SMS, push)", "Plnění smlouvy a oprávněný zájem — čl. 6 odst. 1 písm. b) a f)"],
            ["Zasílání newsletteru a obchodních sdělení", "Souhlas, příp. oprávněný zájem u stávajících zákazníků — čl. 6 odst. 1 písm. a) / f)"],
            ["AI asistent a doporučování (viz čl. 6)", "Plnění smlouvy / oprávněný zájem — čl. 6 odst. 1 písm. b) / f)"],
            ["Analytické a marketingové cookies", "Souhlas — čl. 6 odst. 1 písm. a)"],
            ["Uplatnění a obhajoba právních nároků", "Oprávněný zájem — čl. 6 odst. 1 písm. f)"],
          ],
        },
      ],
    },
    {
      id: "prijemci",
      title: "5. Příjemci a zpracovatelé",
      blocks: [
        {
          type: "p",
          text: "Vaše údaje zpřístupňujeme jiným uživatelům jen v rozsahu nutném pro poskytnutí služby (např. fachmanovi předáme kontakt a popis zakázky poté, co reagujete na jeho nabídku). K zajištění provozu využíváme prověřené zpracovatele (subzpracovatele), kteří zpracovávají údaje dle našich pokynů a na základě smluv o zpracování. Aktuální přehled:",
        },
        {
          type: "table",
          head: ["Zpracovatel", "Účel", "Umístění / přenos"],
          rows: [
            ["Supabase, Inc.", "Databáze, autentizace a úložiště souborů", "EU / USA (SCC / Data Privacy Framework)"],
            ["Vercel, Inc.", "Hosting a provoz aplikace", "EU / USA (SCC / DPF)"],
            ["OpenAI (OpenAI Ireland Ltd. / OpenAI, L.L.C.)", "AI asistent, doporučování a automatizovaná moderace obsahu", "EU / USA (SCC / DPF)"],
            ["Resend (Plus Five Five, Inc.)", "Odesílání transakčních e-mailů a newsletteru", "USA (SCC / DPF)"],
            ["SMS brána (SMSbrana / Twilio)", "Odesílání SMS u prioritních poptávek", "ČR / USA dle nastavení (SCC / DPF)"],
            [OPERATOR.paymentProvider, "Zpracování plateb", "Česká republika / EU"],
            ["Poskytovatel push notifikací (Web Push)", "Doručování push notifikací do prohlížeče", "Dle prohlížeče / EU / USA"],
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Předávání mimo EU/EHP",
          text: "U zpracovatelů se sídlem v USA probíhá předávání na základě standardních smluvních doložek EU (SCC), případně certifikace EU–US Data Privacy Framework, s přiměřenými zárukami dle čl. 46 GDPR.",
        },
        {
          type: "p",
          text: "Údaje můžeme dále předat orgánům veřejné moci, vyžaduje-li to zákon. Údaje neprodáváme.",
        },
      ],
    },
    {
      id: "ai",
      title: "6. Zpracování pomocí umělé inteligence",
      blocks: [
        {
          type: "p",
          text: "Platforma využívá služby OpenAI (model řady GPT) pro AI asistenta („Poradce“), doporučování fachmanů a automatizovanou moderaci obsahu. Pro tyto účely mohou být poskytovateli AI předány texty, které zadáte (např. dotaz poradci, popis poptávky, obsah příspěvku).",
        },
        {
          type: "list",
          items: [
            "Do AI nástrojů **nevkládejte citlivé osobní údaje**, které nejsou pro daný účel nezbytné.",
            "Automatizovaná moderace slouží jako pomocný nástroj; nemá vůči vám právní účinky bez lidského posouzení — finální rozhodnutí o obsahu činí Provozovatel (viz [Pravidla obsahu](/pravidla-obsahu)).",
            "Provozovatel eviduje rozsah využití AI (počet a velikost dotazů) pro účely provozu a nákladů.",
          ],
        },
      ],
    },
    {
      id: "ares",
      title: "7. Data z veřejného rejstříku ARES (ghost profily)",
      blocks: [
        {
          type: "p",
          text: "Fachmani zobrazuje veřejně dostupné informace o podnikatelských subjektech z registru ARES provozovaného Ministerstvem financí ČR, abychom uživatelům nabídli co nejširší přehled dostupných řemeslníků a poskytovatelů služeb.",
        },
        {
          type: "subsection",
          title: "7.1 Co zveřejňujeme",
          blocks: [
            {
              type: "list",
              items: [
                "název subjektu / jméno podnikatele;",
                "IČO a právní formu;",
                "sídlo v rozsahu obec, okres, kraj (u fyzických osob bez čísla popisného);",
                "klasifikaci činnosti (CZ-NACE) a z ní odvozenou kategorii;",
                "datum vzniku.",
              ],
            },
          ],
        },
        {
          type: "subsection",
          title: "7.2 Právní základ a opatření",
          blocks: [
            {
              type: "p",
              text: "Právním základem je oprávněný zájem Provozovatele a uživatelů platformy (čl. 6 odst. 1 písm. f) GDPR). Data ARES jsou ze zákona veřejná (zákon č. 304/2013 Sb., zákon č. 455/1991 Sb.). Provedli jsme test proporcionality (balanční test) a přijali tato opatření k ochraně subjektů údajů:",
            },
            {
              type: "list",
              items: [
                "profily označujeme jako **„Neověřeno (ARES)“** — subjekt nemá aktivní účet a nepotvrdil registraci;",
                "u fyzických osob nezveřejňujeme přesnou adresu (jen obec/okres/kraj);",
                "profily lze nastavit na `noindex` (nezobrazování ve vyhledávačích) na žádost subjektu;",
                "subjekty vedené v insolvenčním rejstříku (ISIR) jsou z veřejné části filtrovány.",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Právo vznést námitku (čl. 21 GDPR)",
          text: "Pokud si nepřejete, aby byl váš subjekt na Fachmani zveřejněn, vyplňte formulář na stránce [/gdpr/opt-out](/gdpr/opt-out) nebo nás kontaktujte na [gdpr@fachmani.org](mailto:gdpr@fachmani.org). Po ověření profil odstraníme z veřejné části (typicky do 7 dnů; z indexů vyhledávačů zpravidla do 1–4 týdnů po dalším procházení).",
        },
        {
          type: "callout",
          variant: "legal",
          text: "Zveřejňování dat fyzických osob podnikajících z ARES bez jejich souhlasu je oblast s právním rizikem; přístup opíráme o oprávněný zájem a robustní opt-out. Před produkčním nasazením doporučujeme posouzení advokátem a případně formalizovaný balanční test (LIA).",
        },
      ],
    },
    {
      id: "doba",
      title: "8. Doba uchování údajů",
      blocks: [
        {
          type: "table",
          head: ["Kategorie", "Doba uchování"],
          rows: [
            ["Údaje účtu a aktivity", "Po dobu trvání účtu a 3 roky po jeho zrušení"],
            ["Účetní a daňové doklady", "10 let (zákon o účetnictví, zákon o DPH)"],
            ["Údaje zpracovávané na základě souhlasu (newsletter, marketing. cookies)", "Do odvolání souhlasu, nejdéle však po stanovenou dobu"],
            ["Logy a technické údaje", "Zpravidla 6–12 měsíců"],
            ["Ghost profily z ARES", "Po dobu aktuálnosti veřejného záznamu; po námitce odstraněny z veřejné části"],
          ],
        },
      ],
    },
    {
      id: "prava",
      title: "9. Vaše práva",
      blocks: [
        {
          type: "list",
          items: [
            "**Právo na přístup** — získat informace o zpracování a kopii údajů.",
            "**Právo na opravu** nepřesných a doplnění neúplných údajů.",
            "**Právo na výmaz** („právo být zapomenut“).",
            "**Právo na omezení zpracování.**",
            "**Právo na přenositelnost** údajů ve strojově čitelném formátu.",
            "**Právo vznést námitku** proti zpracování na základě oprávněného zájmu (vč. ghost profilů a přímého marketingu).",
            "**Právo odvolat souhlas** kdykoli, bez vlivu na zákonnost předchozího zpracování.",
          ],
        },
        {
          type: "p",
          text: `Práva uplatníte na [${OPERATOR.emailGdpr}](mailto:${OPERATOR.emailGdpr}). Žádost vyřídíme bez zbytečného odkladu, nejpozději do 1 měsíce. Máte rovněž právo podat stížnost u Úřadu pro ochranu osobních údajů ([www.uoou.cz](https://www.uoou.cz)).`,
        },
      ],
    },
    {
      id: "cookies",
      title: "10. Cookies a zabezpečení",
      blocks: [
        {
          type: "p",
          text: "Podrobnosti o cookies najdete v samostatném dokumentu [Zásady používání cookies](/cookies). K ochraně údajů přijímáme vhodná technická a organizační opatření (šifrování přenosu, řízení přístupů, zabezpečené prostředí poskytovatelů), která průběžně revidujeme.",
        },
      ],
    },
  ],
};

export default function GDPRPage() {
  return <LegalDocument doc={doc} />;
}
