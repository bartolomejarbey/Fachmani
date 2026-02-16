import Link from "next/link";

export default function FAQ() {
  const faqCustomers = [
    {
      question: "Jak zadám poptávku?",
      answer: "Klikněte na tlačítko 'Zadat poptávku', vyplňte formulář s popisem toho, co potřebujete, vyberte kategorii, lokalitu a případně rozpočet. Po odeslání bude vaše poptávka viditelná pro ověřené fachmany."
    },
    {
      question: "Je zadání poptávky zdarma?",
      answer: "Ano, zadání poptávky je zcela zdarma a nezávazné. Platíte až za samotnou službu přímo fachmanovi, pokud se dohodnete."
    },
    {
      question: "Jak dlouho je poptávka aktivní?",
      answer: "Poptávka je aktivní 14 dní od vytvoření. Během této doby vám mohou fachmani posílat své nabídky. Po uplynutí doby se poptávka automaticky uzavře."
    },
    {
      question: "Jak vyberu správného fachmana?",
      answer: "Porovnejte nabídky podle ceny, termínu a hodnocení. Prohlédněte si profily fachmanů, jejich portfolio a recenze od ostatních zákazníků. Můžete také komunikovat přes chat a položit doplňující otázky."
    },
    {
      question: "Je komunikace bezpečná?",
      answer: "Ano, veškerá komunikace probíhá přes náš zabezpečený interní chat. Vaše kontaktní údaje jsou sdíleny až po vzájemné dohodě."
    },
    {
      question: "Co když nejsem spokojený se službou?",
      answer: "Po dokončení služby můžete ohodnotit fachmana a napsat recenzi. V případě problémů nás kontaktujte a pomůžeme vám situaci vyřešit."
    }
  ];

  const faqProviders = [
    {
      question: "Jak se mohu registrovat jako fachman?",
      answer: "Klikněte na 'Registrace', vyberte možnost 'Jsem fachman' a vyplňte registrační formulář. Pro odesílání nabídek budete muset ověřit svou identitu."
    },
    {
      question: "Proč musím ověřit identitu?",
      answer: "Ověření identity přes BankID zvyšuje důvěryhodnost vašeho profilu a chrání zákazníky před podvodníky. Ověření fachmani mají výrazně vyšší úspěšnost získání zakázek."
    },
    {
      question: "Kolik stojí používání platformy?",
      answer: "Základní účet je zdarma s omezeným počtem nabídek měsíčně. Pro neomezené nabídky a další výhody nabízíme Premium členství. Podrobnosti najdete v ceníku."
    },
    {
      question: "Jak získám více zakázek?",
      answer: "Vyplňte kompletně svůj profil, přidejte portfolio prací, sbírejte pozitivní recenze a reagujte na poptávky rychle. Premium členové mají také zvýrazněný profil."
    },
    {
      question: "Mohu upravit nebo stáhnout nabídku?",
      answer: "Ano, odeslanou nabídku můžete upravit nebo stáhnout dokud ji zákazník nepřijme."
    },
    {
      question: "Jak funguje hodnocení?",
      answer: "Po dokončení zakázky vás zákazník může ohodnotit 1-5 hvězdičkami a napsat recenzi. Vaše průměrné hodnocení se zobrazuje na vašem profilu."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <div className="space-x-4">
            <Link href="/jak-to-funguje" className="text-gray-600 hover:text-gray-900">
              Jak to funguje
            </Link>
            <Link href="/kategorie" className="text-gray-600 hover:text-gray-900">
              Kategorie
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Přihlásit se
            </Link>
            <Link href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Registrace
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Časté dotazy</h1>
          <p className="text-xl text-blue-100">
            Odpovědi na nejčastější otázky o Fachmani
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Pro zákazníky */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-3">🏠</span> Pro zákazníky
          </h2>
          <div className="space-y-4">
            {faqCustomers.map((item, index) => (
              <details key={index} className="bg-white rounded-lg shadow-sm">
                <summary className="px-6 py-4 cursor-pointer font-medium hover:bg-gray-50 list-none flex justify-between items-center">
                  {item.question}
                  <span className="text-gray-400">+</span>
                </summary>
                <div className="px-6 pb-4 text-gray-600">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Pro fachmany */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-3">🔧</span> Pro fachmany
          </h2>
          <div className="space-y-4">
            {faqProviders.map((item, index) => (
              <details key={index} className="bg-white rounded-lg shadow-sm">
                <summary className="px-6 py-4 cursor-pointer font-medium hover:bg-gray-50 list-none flex justify-between items-center">
                  {item.question}
                  <span className="text-gray-400">+</span>
                </summary>
                <div className="px-6 pb-4 text-gray-600">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Nenašli jste odpověď */}
        <section className="bg-blue-50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Nenašli jste odpověď?</h2>
          <p className="text-gray-600 mb-6">
            Napište nám a rádi vám pomůžeme.
          </p>
          <Link
            href="/kontakt"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Kontaktovat podporu
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Fachmani</h3>
              <p className="text-gray-400">
                Platforma pro propojení zákazníků s ověřenými poskytovateli služeb.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Pro zákazníky</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/jak-to-funguje" className="hover:text-white">Jak to funguje</Link></li>
                <li><Link href="/kategorie" className="hover:text-white">Kategorie služeb</Link></li>
                <li><Link href="/nova-poptavka" className="hover:text-white">Zadat poptávku</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Pro fachmany</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/pro-fachmany" className="hover:text-white">Proč Fachmani</Link></li>
                <li><Link href="/cenik" className="hover:text-white">Ceník</Link></li>
                <li><Link href="/auth/register?role=provider" className="hover:text-white">Registrace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Podpora</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/faq" className="hover:text-white">Časté dotazy</Link></li>
                <li><Link href="/kontakt" className="hover:text-white">Kontakt</Link></li>
                <li><Link href="/vop" className="hover:text-white">Obchodní podmínky</Link></li>
                <li><Link href="/gdpr" className="hover:text-white">Ochrana údajů</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 Fachmani. Všechna práva vyhrazena.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
