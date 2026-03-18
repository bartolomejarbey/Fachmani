"use client";

import Link from "next/link";
import { useSettings } from "@/lib/useSettings";

export default function ProFachmany() {
  const { settings } = useSettings();
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
            <Link href="/cenik" className="text-gray-600 hover:text-gray-900">
              Ceník
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Přihlásit se
            </Link>
            <Link href="/auth/register?role=provider" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Registrovat se
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Získejte nové zakázky bez námahy
            </h1>
            <p className="text-xl text-green-100 mb-8">
              Připojte se k síti ověřených fachmanů a dostávejte poptávky od zákazníků ve vašem okolí. Žádné volání, žádné shánění – zákazníci přijdou za vámi.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/auth/register?role=provider"
                className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100"
              >
                Zaregistrovat se zdarma
              </Link>
              <Link
                href="/cenik"
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700"
              >
                Zobrazit ceník
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistiky */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
              <p className="text-gray-600">Aktivních fachmanů</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">2 000+</div>
              <p className="text-gray-600">Dokončených zakázek</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
              <p className="text-gray-600">Spokojených zákazníků</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">15 000 Kč</div>
              <p className="text-gray-600">Průměrná hodnota zakázky</p>
            </div>
          </div>
        </div>
      </section>

      {/* Výhody */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Proč se přidat k Fachmani?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-3">Poptávky přímo k vám</h3>
              <p className="text-gray-600">
                Žádné aktivní shánění zákazníků. Poptávky z vašeho okolí vám přijdou přímo do aplikace.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-3">Důvěryhodnost</h3>
              <p className="text-gray-600">
                Přehledný profil, reference a budoucí verifikační prvky vám pomohou odlišit se od konkurence.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-3">Férové podmínky</h3>
              <p className="text-gray-600">
                Žádné skryté poplatky. Začněte zdarma a plaťte jen když chcete více.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold mb-3">Budujte reputaci</h3>
              <p className="text-gray-600">
                Sbírejte hodnocení a recenze. Čím lepší profil, tím více zakázek.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-semibold mb-3">Lokální zákazníci</h3>
              <p className="text-gray-600">
                Pracujte ve svém okolí. Nastavte si oblasti, kde chcete dostávat poptávky.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-3">Jednoduchá komunikace</h3>
              <p className="text-gray-600">
                Vše vyřídíte přes chat v aplikaci. Bez zbytečného telefonování.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Jak to funguje */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Jak začít?</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Zaregistrujte se</h3>
              <p className="text-gray-600 text-sm">
                Vyplňte základní údaje a vyberte své obory.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Verifikace profilu</h3>
              <p className="text-gray-600 text-sm">
                Připravujeme verifikaci profilu. Funkce je momentálně ve vývoji.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Doplňte profil</h3>
              <p className="text-gray-600 text-sm">
                Přidejte fotky prací, popis služeb a reference.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">Posílejte nabídky</h3>
              <p className="text-gray-600 text-sm">
                Reagujte na poptávky a získávejte zakázky.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cenové plány */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Jednoduchý ceník</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Začněte zdarma. Upgradujte kdykoli budete potřebovat více.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="font-semibold text-lg mb-2">Start</h3>
              <p className="text-3xl font-bold mb-4">Zdarma</p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✓ {settings.platform.free_offers_per_month} nabídky měsíčně</li>
                <li>✓ Základní profil</li>
                <li>✓ Chat se zákazníky</li>
              </ul>
              <Link
                href="/auth/register?role=provider"
                className="block text-center bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                Začít zdarma
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-600 relative">
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-full text-xs">
                Doporučujeme
              </span>
              <h3 className="font-semibold text-lg mb-2">Premium</h3>
              <p className="text-3xl font-bold mb-4">{settings.subscriptions.premium_monthly} Kč<span className="text-sm font-normal">/měs</span></p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✓ Neomezené nabídky</li>
                <li>✓ Zvýrazněný profil</li>
                <li>✓ Prioritní zobrazení</li>
                <li>✓ Statistiky</li>
              </ul>
              <Link
                href="/auth/register?role=provider&plan=premium"
                className="block text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Vyzkoušet Premium
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="font-semibold text-lg mb-2">Business</h3>
              <p className="text-3xl font-bold mb-4">{settings.subscriptions.business_monthly.toLocaleString()} Kč<span className="text-sm font-normal">/měs</span></p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>✓ Vše z Premium</li>
                <li>✓ Firemní profil</li>
                <li>✓ Více uživatelů</li>
                <li>✓ API přístup</li>
              </ul>
              <Link
                href="/kontakt?subject=business"
                className="block text-center bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800"
              >
                Kontaktovat
              </Link>
            </div>
          </div>

          <p className="text-center mt-8">
            <Link href="/cenik" className="text-green-600 hover:underline">
              Zobrazit kompletní ceník →
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Připraveni začít?</h2>
          <p className="text-xl text-green-100 mb-8">
            Registrace trvá jen 2 minuty. Bez závazků.
          </p>
          <Link
            href="/auth/register?role=provider"
            className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100"
          >
            Zaregistrovat se zdarma
          </Link>
        </div>
      </section>

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
