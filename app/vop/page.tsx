"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function VOP() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: "uvod",
      title: "1. Úvodní ustanovení",
      content: `Tyto všeobecné obchodní podmínky (dále jen „VOP") upravují práva a povinnosti mezi společností Fachmani s.r.o., IČO: 12345678, se sídlem Příkladná 123, 110 00 Praha 1 (dále jen „Provozovatel") a uživateli platformy Fachmani (dále jen „Uživatel").

Platformou se rozumí webová aplikace dostupná na adrese www.fachmani.cz, která slouží k propojení zákazníků s poskytovateli služeb (fachmany).`
    },
    {
      id: "registrace",
      title: "2. Registrace a uživatelský účet",
      content: `Pro využívání služeb platformy je nutná registrace. Uživatel je povinen uvést pravdivé a úplné údaje.

Uživatel odpovídá za bezpečnost svého hesla a přihlašovacích údajů. V případě podezření na zneužití účtu je povinen neprodleně kontaktovat Provozovatele.

Provozovatel si vyhrazuje právo zrušit účet Uživatele, který porušuje tyto VOP nebo platné právní předpisy.`
    },
    {
      id: "sluzby",
      title: "3. Popis služeb",
      content: `Platforma umožňuje:
- Zákazníkům zadávat poptávky na služby
- Fachmanům prohlížet poptávky a zasílat nabídky
- Vzájemnou komunikaci mezi zákazníky a fachmany
- Hodnocení a recenze služeb

Provozovatel nezaručuje uzavření smlouvy mezi zákazníkem a fachmanem. Provozovatel není stranou smlouvy uzavřené mezi zákazníkem a fachmanem.`
    },
    {
      id: "ceny",
      title: "4. Ceny a platební podmínky",
      content: `Základní používání platformy je pro zákazníky zdarma.

Pro fachmany je k dispozici:
- Bezplatný tarif s omezeným počtem nabídek měsíčně
- Premium členství s neomezeným počtem nabídek a dalšími výhodami

Aktuální ceník je dostupný na stránce Ceník. Provozovatel si vyhrazuje právo změnit ceník s předchozím oznámením.`
    },
    {
      id: "overeni",
      title: "5. Ověření identity",
      content: `Fachmani mohou projít ověřením identity prostřednictvím služby BankID. Ověření je dobrovolné, ale ověření fachmani získávají výhody jako zvýrazněný profil a vyšší důvěryhodnost.

Provozovatel neodpovídá za správnost údajů poskytnutých prostřednictvím BankID.`
    },
    {
      id: "odpoved",
      title: "6. Odpovědnost",
      content: `Provozovatel neodpovídá za:
- Kvalitu služeb poskytovaných fachmany
- Škody vzniklé v souvislosti se službami fachmanů
- Obsah zveřejněný uživateli
- Výpadky služby způsobené třetími stranami

Uživatel odpovídá za obsah, který na platformě zveřejní. Je zakázáno zveřejňovat obsah porušující právní předpisy nebo práva třetích osob.`
    },
    {
      id: "reklamace",
      title: "7. Reklamace a řešení sporů",
      content: `V případě nespokojenosti se službami platformy může Uživatel podat reklamaci na email podpora@fachmani.cz. Reklamace bude vyřízena do 30 dnů.

Spory mezi zákazníky a fachmany řeší strany přímo mezi sebou. Provozovatel může na žádost poskytnout součinnost.`
    },
    {
      id: "ukonceni",
      title: "8. Ukončení smluvního vztahu",
      content: `Uživatel může kdykoli zrušit svůj účet v nastavení profilu nebo zasláním žádosti na podpora@fachmani.cz.

Provozovatel může účet zrušit v případě porušení VOP. V takovém případě nemá Uživatel nárok na vrácení uhrazených poplatků.`
    },
    {
      id: "zaverecna",
      title: "9. Závěrečná ustanovení",
      content: `Tyto VOP se řídí právním řádem České republiky. Provozovatel si vyhrazuje právo VOP změnit. O změnách bude Uživatel informován emailem nebo oznámením na platformě.

Tyto VOP jsou platné a účinné od 1. 1. 2025.`
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              PRÁVNÍ DOKUMENT
            </span>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Všeobecné obchodní podmínky
            </h1>
            <p className="text-gray-600">
              Platné od 1. ledna 2025
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {sections.map((section, index) => (
              <div key={section.id} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <span className={`text-gray-400 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {activeSection === section.id && (
                  <div className="px-6 pb-6 text-gray-600 whitespace-pre-line">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
            <h3 className="font-semibold text-gray-900 mb-4">Související dokumenty</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/gdpr" className="text-cyan-600 hover:text-cyan-700 font-medium">
                Ochrana osobních údajů →
              </Link>
              <Link href="/faq" className="text-cyan-600 hover:text-cyan-700 font-medium">
                Časté dotazy →
              </Link>
              <Link href="/kontakt" className="text-cyan-600 hover:text-cyan-700 font-medium">
                Kontaktujte nás →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}