"use client";

import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function VOPPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Všeobecné obchodní podmínky</h1>
        <p className="text-gray-500 mb-8">Platné od 1. 1. 2025</p>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Úvodní ustanovení</h2>
            <p className="text-gray-600 mb-3">
              1.1. Tyto všeobecné obchodní podmínky upravují práva a povinnosti uživatelů platformy Fachmani.
            </p>
            <p className="text-gray-600 mb-3">
              1.2. Platforma slouží k propojení osob poptávajících služby s poskytovateli služeb.
            </p>
            <p className="text-gray-600">
              1.3. Registrací na Platformě uživatel potvrzuje, že se seznámil s těmito VOP a souhlasí s nimi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Registrace a uživatelský účet</h2>
            <p className="text-gray-600 mb-3">
              2.1. Pro využívání služeb Platformy je nutná registrace. Uživatel je povinen uvést pravdivé a úplné údaje.
            </p>
            <p className="text-gray-600 mb-3">
              2.2. Fachmani jsou povinni ověřit svou identitu prostřednictvím služby BankID.
            </p>
            <p className="text-gray-600">
              2.3. Uživatel je odpovědný za zabezpečení svého účtu a hesla.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Poptávky a nabídky</h2>
            <p className="text-gray-600 mb-3">
              3.1. Zákazník může prostřednictvím Platformy zveřejnit poptávku na službu.
            </p>
            <p className="text-gray-600 mb-3">
              3.2. Fachmani mohou na zveřejněné poptávky reagovat zasláním nabídky.
            </p>
            <p className="text-gray-600">
              3.3. Zákazník si svobodně vybírá z obdržených nabídek.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Závěrečná ustanovení</h2>
            <p className="text-gray-600 mb-3">
              4.1. Tyto VOP se řídí právním řádem České republiky.
            </p>
            <p className="text-gray-600">
              4.2. V případě sporů je příslušný soud v České republice.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-cyan-600 hover:underline">
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}