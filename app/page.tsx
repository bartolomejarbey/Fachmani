import Link from "next/link";

export default function Home() {
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

      {/* Hero sekce */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Najdi ověřeného fachmana ve svém okolí
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Potřebujete řemeslníka, účetní nebo pomoc s úklidem? Zadejte poptávku a nechte fachmany, ať se ozvou vám.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/nova-poptavka"
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700"
          >
            Zadat poptávku
          </Link>
          <Link
            href="/auth/register?role=provider"
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50"
          >
            Jsem fachman
          </Link>
        </div>
      </section>

      {/* Jak to funguje */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Jak to funguje</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Zadejte poptávku</h3>
              <p className="text-gray-600">Popište co potřebujete, kde a kdy. Zabere to 2 minuty.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dostanete nabídky</h3>
              <p className="text-gray-600">Ověření fachmani vám pošlou své nabídky s cenou a termínem.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Vyberte si</h3>
              <p className="text-gray-600">Porovnejte nabídky a vyberte fachmana, který vám vyhovuje.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 Fachmani. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </div>
  );
}