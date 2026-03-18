"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function GDPR() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("spravce");

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      id: "spravce",
      title: "1. Správce osobních údajů",
      icon: "🏢",
      content: `Správcem osobních údajů je společnost Fachmani s.r.o., IČO: 12345678, se sídlem Příkladná 123, 110 00 Praha 1 (dále jen „Správce").

Kontakt pro záležitosti ochrany osobních údajů: gdpr@fachmani.cz`
    },
    {
      id: "udaje",
      title: "2. Jaké údaje zpracováváme",
      icon: "📋",
      content: `V rámci poskytování služeb platformy Fachmani zpracováváme následující kategorie osobních údajů:

- Identifikační údaje: jméno, příjmení, email, telefonní číslo
- Přihlašovací údaje: email, heslo (šifrované)
- Údaje o aktivitě: poptávky, nabídky, zprávy, hodnocení
- Technické údaje: IP adresa, typ prohlížeče, cookies
- Fakturační údaje: u Premium členství adresa, IČO (pokud je uvedeno)`
    },
    {
      id: "ucely",
      title: "3. Účely zpracování",
      icon: "🎯",
      content: `Vaše osobní údaje zpracováváme pro tyto účely:

- Poskytování služeb platformy (propojení zákazníků a fachmanů)
- Správa uživatelského účtu
- Komunikace s uživateli (notifikace, podpora)
- Zlepšování služeb a analýza používání
- Plnění právních povinností
- Zasílání obchodních sdělení (pouze se souhlasem)`
    },
    {
      id: "zaklad",
      title: "4. Právní základ zpracování",
      icon: "⚖️",
      content: `Osobní údaje zpracováváme na základě:

- Plnění smlouvy – pro poskytování služeb platformy
- Oprávněný zájem – pro zlepšování služeb a ochranu před podvody
- Právní povinnost – pro plnění zákonných požadavků
- Souhlas – pro zasílání marketingových sdělení`
    },
    {
      id: "doba",
      title: "5. Doba uchovávání údajů",
      icon: "⏱️",
      content: `Osobní údaje uchováváme po dobu:

- Po dobu trvání účtu a 3 roky po jeho zrušení
- Fakturační údaje po dobu stanovenou zákonem (10 let)
- Údaje zpracovávané na základě souhlasu do jeho odvolání`
    },
    {
      id: "sdileni",
      title: "6. Sdílení údajů",
      icon: "🔗",
      content: `Vaše osobní údaje můžeme sdílet s:

- Druhými uživateli platformy (v rozsahu nutném pro poskytnutí služby)
- Poskytovateli technických služeb (hosting, emailing)
- Státními orgány (pokud to vyžaduje zákon)

Všichni naši partneři jsou vázáni povinností mlčenlivosti a zpracovávají údaje pouze podle našich pokynů.`
    },
    {
      id: "prava",
      title: "7. Vaše práva",
      icon: "✋",
      content: `V souvislosti se zpracováním osobních údajů máte tato práva:

- Právo na přístup – získat informace o zpracování vašich údajů
- Právo na opravu – opravit nepřesné nebo doplnit neúplné údaje
- Právo na výmaz – požádat o smazání údajů („právo být zapomenut")
- Právo na omezení zpracování – omezit způsob zpracování
- Právo na přenositelnost – získat údaje ve strojově čitelném formátu
- Právo vznést námitku – proti zpracování na základě oprávněného zájmu
- Právo odvolat souhlas – kdykoli odvolat udělený souhlas

Pro uplatnění svých práv nás kontaktujte na gdpr@fachmani.cz.`
    },
    {
      id: "cookies",
      title: "8. Cookies",
      icon: "🍪",
      content: `Naše platforma používá cookies pro:

- Nezbytné cookies – pro fungování webu (přihlášení, bezpečnost)
- Analytické cookies – pro analýzu návštěvnosti (Google Analytics)
- Marketingové cookies – pro personalizaci reklam (pouze se souhlasem)

Nastavení cookies můžete změnit v nastavení vašeho prohlížeče.`
    },
    {
      id: "zabezpeceni",
      title: "9. Zabezpečení",
      icon: "🔒",
      content: `Přijímáme vhodná technická a organizační opatření k ochraně vašich osobních údajů před neoprávněným přístupem, ztrátou nebo zneužitím. 

Používáme šifrování, zabezpečené servery a pravidelně aktualizujeme naše bezpečnostní postupy.`
    },
    {
      id: "kontakt",
      title: "10. Kontakt a stížnosti",
      icon: "📬",
      content: `V případě dotazů ohledně zpracování osobních údajů nás kontaktujte:

Email: gdpr@fachmani.cz
Adresa: Fachmani s.r.o., Příkladná 123, 110 00 Praha 1

Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).`
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              🔒 OCHRANA SOUKROMÍ
            </span>
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Zásady ochrany osobních údajů
            </h1>
            <p className="text-lg text-gray-600">
              Platné od 1. ledna 2025
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Quick summary */}
          <div className={`bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-emerald-100 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className="font-semibold text-gray-900 mb-3">📝 Stručně</h2>
            <p className="text-gray-600">
              Vaše soukromí je pro nás prioritou. Zpracováváme pouze údaje nezbytné pro fungování platformy. 
              Vaše data nikdy neprodáváme třetím stranám. Máte plnou kontrolu nad svými údaji.
            </p>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <button
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <span className="font-semibold text-gray-900">{section.title}</span>
                  </div>
                  <span className={`text-cyan-500 transition-transform flex-shrink-0 ${
                    activeSection === section.id ? 'rotate-180' : ''
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {activeSection === section.id && (
                  <div className="px-6 pb-5 text-gray-600 border-t border-gray-100 pt-4 whitespace-pre-line">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Related */}
          <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
            <h3 className="font-semibold text-gray-900 mb-4">Související dokumenty</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/vop" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium">
                📄 Obchodní podmínky →
              </Link>
              <Link href="/faq" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium">
                ❓ Časté dotazy →
              </Link>
              <Link href="/kontakt" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium">
                📧 Kontakt →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
