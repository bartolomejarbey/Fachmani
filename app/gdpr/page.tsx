import Link from "next/link";

export default function GDPR() {
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
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Přihlásit se
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Zásady ochrany osobních údajů</h1>
        <p className="text-gray-500 mb-8">Platné od 1. 1. 2025</p>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Správce osobních údajů</h2>
            <p className="text-gray-600 mb-3">
              Správcem osobních údajů je společnost Fachmani s.r.o., IČO: 12345678, se sídlem Příkladná 123, 110 00 Praha 1 (dále jen „Správce").
            </p>
            <p className="text-gray-600">
              Kontakt pro záležitosti ochrany osobních údajů: gdpr@fachmani.cz
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Jaké údaje zpracováváme</h2>
            <p className="text-gray-600 mb-3">
              V rámci poskytování služeb platformy Fachmani zpracováváme následující kategorie osobních údajů:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Identifikační údaje:</strong> jméno, příjmení, email, telefonní číslo</li>
              <li><strong>Přihlašovací údaje:</strong> email, heslo (šifrované)</li>
              <li><strong>Údaje z ověření:</strong> údaje z BankID pro ověřené fachmany</li>
              <li><strong>Údaje o aktivitě:</strong> poptávky, nabídky, zprávy, hodnocení</li>
              <li><strong>Technické údaje:</strong> IP adresa, typ prohlížeče, cookies</li>
              <li><strong>Fakturační údaje:</strong> u Premium členství adresa, IČO (pokud je uvedeno)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Účely zpracování</h2>
            <p className="text-gray-600 mb-3">
              Vaše osobní údaje zpracováváme pro tyto účely:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Poskytování služeb platformy (propojení zákazníků a fachmanů)</li>
              <li>Správa uživatelského účtu</li>
              <li>Ověření identity fachmanů</li>
              <li>Komunikace s uživateli (notifikace, podpora)</li>
              <li>Zlepšování služeb a analýza používání</li>
              <li>Plnění právních povinností</li>
              <li>Zasílání obchodních sdělení (pouze se souhlasem)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Právní základ zpracování</h2>
            <p className="text-gray-600 mb-3">
              Osobní údaje zpracováváme na základě:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Plnění smlouvy</strong> – pro poskytování služeb platformy</li>
              <li><strong>Oprávněný zájem</strong> – pro zlepšování služeb a ochranu před podvody</li>
              <li><strong>Právní povinnost</strong> – pro plnění zákonných požadavků</li>
              <li><strong>Souhlas</strong> – pro zasílání marketingových sdělení</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Doba uchovávání údajů</h2>
            <p className="text-gray-600 mb-3">
              Osobní údaje uchováváme po dobu:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Po dobu trvání účtu a 3 roky po jeho zrušení</li>
              <li>Fakturační údaje po dobu stanovenou zákonem (10 let)</li>
              <li>Údaje zpracovávané na základě souhlasu do jeho odvolání</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Sdílení údajů</h2>
            <p className="text-gray-600 mb-3">
              Vaše osobní údaje můžeme sdílet s:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Druhými uživateli platformy (v rozsahu nutném pro poskytnutí služby)</li>
              <li>Poskytovateli technických služeb (hosting, emailing)</li>
              <li>Poskytovatelem ověření identity (BankID)</li>
              <li>Státními orgány (pokud to vyžaduje zákon)</li>
            </ul>
            <p className="text-gray-600 mt-3">
              Všichni naši partneři jsou vázáni povinností mlčenlivosti a zpracovávají údaje pouze podle našich pokynů.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Vaše práva</h2>
            <p className="text-gray-600 mb-3">
              V souvislosti se zpracováním osobních údajů máte tato práva:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Právo na přístup</strong> – získat informace o zpracování vašich údajů</li>
              <li><strong>Právo na opravu</strong> – opravit nepřesné nebo doplnit neúplné údaje</li>
              <li><strong>Právo na výmaz</strong> – požádat o smazání údajů („právo být zapomenut")</li>
              <li><strong>Právo na omezení zpracování</strong> – omezit způsob zpracování</li>
              <li><strong>Právo na přenositelnost</strong> – získat údaje ve strojově čitelném formátu</li>
              <li><strong>Právo vznést námitku</strong> – proti zpracování na základě oprávněného zájmu</li>
              <li><strong>Právo odvolat souhlas</strong> – kdykoli odvolat udělený souhlas</li>
            </ul>
            <p className="text-gray-600 mt-3">
              Pro uplatnění svých práv nás kontaktujte na gdpr@fachmani.cz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-gray-600 mb-3">
              Naše platforma používá cookies pro:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Nezbytné cookies</strong> – pro fungování webu (přihlášení, bezpečnost)</li>
              <li><strong>Analytické cookies</strong> – pro analýzu návštěvnosti (Google Analytics)</li>
              <li><strong>Marketingové cookies</strong> – pro personalizaci reklam (pouze se souhlasem)</li>
            </ul>
            <p className="text-gray-600 mt-3">
              Nastavení cookies můžete změnit v nastavení vašeho prohlížeče.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Zabezpečení</h2>
            <p className="text-gray-600">
              Přijímáme vhodná technická a organizační opatření k ochraně vašich osobních údajů před neoprávněným přístupem, ztrátou nebo zneužitím. Používáme šifrování, zabezpečené servery a pravidelně aktualizujeme naše bezpečnostní postupy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Kontakt a stížnosti</h2>
            <p className="text-gray-600 mb-3">
              V případě dotazů ohledně zpracování osobních údajů nás kontaktujte:
            </p>
            <p className="text-gray-600 mb-3">
              Email: gdpr@fachmani.cz<br />
              Adresa: Fachmani s.r.o., Příkladná 123, 110 00 Praha 1
            </p>
            <p className="text-gray-600">
              Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Fachmani. Všechna práva vyhrazena.</p>
          <div className="mt-4 space-x-4">
            <Link href="/vop" className="hover:text-white">VOP</Link>
            <Link href="/gdpr" className="hover:text-white">GDPR</Link>
            <Link href="/kontakt" className="hover:text-white">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
