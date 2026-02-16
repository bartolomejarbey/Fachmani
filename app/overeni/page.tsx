"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Overeni() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified, role")
        .eq("id", user.id)
        .single();

      if (profile?.is_verified) {
        setVerified(true);
      }

      if (profile?.role !== "provider") {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  const handleStartVerification = () => {
    setStep(2);
  };

  const handleBankIdSimulation = async () => {
    setVerifying(true);
    setError("");

    // Simulace BankID ověření (3 sekundy)
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", user.id);

        if (updateError) {
          setError("Chyba při ověřování. Zkuste to prosím znovu.");
          setVerifying(false);
          return;
        }

        setStep(3);
        setVerified(true);
      }
    } catch (err) {
      setError("Chyba při ověřování. Zkuste to prosím znovu.");
    }

    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <Link href="/dashboard/fachman" className="text-gray-600 hover:text-gray-900">
            Zpět na dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Již ověřen */}
        {verified && step !== 3 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-800 mb-2">Váš účet je ověřen</h1>
            <p className="text-green-700 mb-6">
              Můžete posílat nabídky na poptávky zákazníků.
            </p>
            <Link
              href="/dashboard/fachman"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Přejít na dashboard
            </Link>
          </div>
        )}

        {/* Krok 1: Úvod */}
        {!verified && step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔐</div>
              <h1 className="text-3xl font-bold mb-2">Ověření identity</h1>
              <p className="text-gray-600">
                Pro odesílání nabídek potřebujeme ověřit vaši identitu přes BankID.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl">🏦</div>
                <div>
                  <h3 className="font-semibold">Co je BankID?</h3>
                  <p className="text-sm text-gray-600">
                    BankID je bezpečný způsob ověření identity pomocí vaší banky. 
                    Stačí se přihlásit do svého internetového bankovnictví.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="text-2xl">✓</div>
                <div>
                  <h3 className="font-semibold">Proč ověřujeme?</h3>
                  <p className="text-sm text-gray-600">
                    Ověření zvyšuje důvěryhodnost vašeho profilu. 
                    Zákazníci dávají přednost ověřeným fachmanům.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl">⏱️</div>
                <div>
                  <h3 className="font-semibold">Jak dlouho to trvá?</h3>
                  <p className="text-sm text-gray-600">
                    Celý proces zabere méně než 2 minuty.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartVerification}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700"
            >
              Zahájit ověření
            </button>
          </div>
        )}

        {/* Krok 2: BankID simulace */}
        {!verified && step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏦</div>
              <h1 className="text-2xl font-bold mb-2">Přihlaste se přes BankID</h1>
              <p className="text-gray-600">
                Vyberte svou banku a přihlaste se do internetového bankovnictví.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Simulované banky */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { name: "Česká spořitelna", color: "bg-blue-600" },
                { name: "ČSOB", color: "bg-blue-800" },
                { name: "Komerční banka", color: "bg-red-600" },
                { name: "Raiffeisenbank", color: "bg-yellow-500" },
                { name: "mBank", color: "bg-green-600" },
                { name: "Fio banka", color: "bg-green-700" },
              ].map((bank) => (
                <button
                  key={bank.name}
                  onClick={handleBankIdSimulation}
                  disabled={verifying}
                  className={`${bank.color} text-white p-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50`}
                >
                  {bank.name}
                </button>
              ))}
            </div>

            {verifying && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
                <p className="text-gray-600">Ověřuji identitu...</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setStep(1)}
                disabled={verifying}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Zpět
              </button>
            </div>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 text-center">
                🔒 Toto je demo verze. V produkci by proběhlo skutečné ověření přes BankID API.
              </p>
            </div>
          </div>
        )}

        {/* Krok 3: Úspěch */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">Ověření dokončeno!</h1>
            <p className="text-gray-600 mb-8">
              Váš účet byl úspěšně ověřen. Nyní můžete posílat nabídky na poptávky zákazníků.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-green-800 mb-2">Co dál?</h2>
              <ul className="text-sm text-green-700 space-y-2 text-left">
                <li>✓ Doplňte svůj profil (bio, lokality, hodinová sazba)</li>
                <li>✓ Vyberte kategorie služeb, které nabízíte</li>
                <li>✓ Prohlédněte si dostupné poptávky</li>
                <li>✓ Pošlete svou první nabídku</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard/fachman/profil"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Upravit profil
              </Link>
              <Link
                href="/dashboard/fachman"
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200"
              >
                Zobrazit poptávky
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}