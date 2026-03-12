import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Hlavní footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo a popis */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Fachmani"
                width={240}
                height={75}
                className="h-16 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 mt-4 max-w-sm">
              Platforma pro propojení zákazníků s ověřenými profesionály.
              Najděte fachmana snadno a rychle.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                <span>📘</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                <span>📷</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                <span>🐦</span>
              </a>
            </div>
          </div>

          {/* Pro zákazníky */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Pro zákazníky</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/jak-to-funguje" className="hover:text-white transition-colors">
                  Jak to funguje
                </Link>
              </li>
              <li>
                <Link href="/poptavky" className="hover:text-white transition-colors">
                  Prohlížet poptávky
                </Link>
              </li>
              <li>
                <Link href="/fachmani" className="hover:text-white transition-colors">
                  Najít fachmana
                </Link>
              </li>
              <li>
                <Link href="/kategorie" className="hover:text-white transition-colors">
                  Kategorie služeb
                </Link>
              </li>
              <li>
                <Link href="/nova-poptavka" className="hover:text-white transition-colors">
                  Zadat poptávku
                </Link>
              </li>
            </ul>
          </div>

          {/* Pro fachmany */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Pro fachmany</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/pro-fachmany" className="hover:text-white transition-colors">
                  Proč Fachmani
                </Link>
              </li>
              <li>
                <Link href="/cenik" className="hover:text-white transition-colors">
                  Ceník
                </Link>
              </li>
              <li>
                <Link href="/auth/register?role=provider" className="hover:text-white transition-colors">
                  Registrace fachmana
                </Link>
              </li>
              <li>
                <Link href="/overeni" className="hover:text-white transition-colors">
                  Ověření identity
                </Link>
              </li>
            </ul>
          </div>

          {/* Podpora */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Podpora</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Časté dotazy
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-white transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/vop" className="hover:text-white transition-colors">
                  Obchodní podmínky
                </Link>
              </li>
              <li>
                <Link href="/gdpr" className="hover:text-white transition-colors">
                  Ochrana údajů
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Spodní lišta */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 Fachmani. Všechna práva vyhrazena.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/vop" className="hover:text-white transition-colors">
              Podmínky
            </Link>
            <Link href="/gdpr" className="hover:text-white transition-colors">
              Soukromí
            </Link>
            <Link href="/kontakt" className="hover:text-white transition-colors">
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
