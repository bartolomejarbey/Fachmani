"use client";

import { useState } from "react";
import Link from "next/link";

export default function Kontakt() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Tady by byla integrace s emailovou službou (Resend, SendGrid, etc.)
    // Pro teď jen simulujeme odeslání
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSent(true);
    setSending(false);
  };

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
          <h1 className="text-4xl font-bold mb-4">Kontaktujte nás</h1>
          <p className="text-xl text-blue-100">
            Máte dotaz nebo potřebujete pomoc? Jsme tu pro vás.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Kontaktní informace */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Jak nás můžete kontaktovat</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">📧</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-gray-600">podpora@fachmani.cz</p>
                  <p className="text-sm text-gray-500">Odpovídáme do 24 hodin</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">💬</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Live chat</h3>
                  <p className="text-gray-600">Dostupný v pracovní dny 9-17h</p>
                  <p className="text-sm text-gray-500">Klikněte na bublinu vpravo dole</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">📍</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Adresa</h3>
                  <p className="text-gray-600">Fachmani s.r.o.</p>
                  <p className="text-gray-600">Příkladná 123</p>
                  <p className="text-gray-600">110 00 Praha 1</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">🕐</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Provozní doba podpory</h3>
                  <p className="text-gray-600">Pondělí - Pátek: 9:00 - 17:00</p>
                  <p className="text-gray-600">Sobota - Neděle: Email pouze</p>
                </div>
              </div>
            </div>

            {/* FAQ odkaz */}
            <div className="mt-8 p-6 bg-gray-100 rounded-xl">
              <h3 className="font-semibold mb-2">Hledáte rychlou odpověď?</h3>
              <p className="text-gray-600 mb-4">
                Podívejte se do našich často kladených dotazů.
              </p>
              <Link
                href="/faq"
                className="text-blue-600 font-medium hover:underline"
              >
                Přejít na FAQ →
              </Link>
            </div>
          </div>

          {/* Kontaktní formulář */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold mb-6">Napište nám</h2>

              {sent ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-green-600 mb-2">
                    Zpráva odeslána!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Děkujeme za váš dotaz. Odpovíme vám co nejdříve.
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setFormData({ name: "", email: "", subject: "", message: "" });
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Odeslat další zprávu
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jméno *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Předmět *
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Vyberte předmět</option>
                      <option value="general">Obecný dotaz</option>
                      <option value="technical">Technický problém</option>
                      <option value="billing">Fakturace a platby</option>
                      <option value="complaint">Stížnost</option>
                      <option value="partnership">Spolupráce</option>
                      <option value="other">Jiné</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zpráva *
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      placeholder="Popište váš dotaz nebo problém..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? "Odesílám..." : "Odeslat zprávu"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
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
