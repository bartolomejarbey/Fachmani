"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Overeni() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        {!verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-900">
            Funkce verifikace je momentálně ve vývoji. Tato stránka slouží jako mockup budoucího procesu.
          </div>
        )}

        {/* Již ověřen */}
        {verified && (
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

        {/* Neověřený - info o procesu */}
        {!verified && !submitted && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔐</div>
              <h1 className="text-3xl font-bold mb-2">Verifikace profilu</h1>
              <p className="text-gray-600">
                Připravujeme budoucí verifikaci profilů pro poskytovatele služeb.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl">🧪</div>
                <div>
                  <h3 className="font-semibold">Stav funkce</h3>
                  <p className="text-sm text-gray-600">
                    Verifikační proces je aktuálně ve vývoji a zatím není aktivní
                    pro reálné použití.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="text-2xl">✓</div>
                <div>
                  <h3 className="font-semibold">Co bude cílem</h3>
                  <p className="text-sm text-gray-600">
                    Do budoucna má verifikace pomoci zvýšit důvěryhodnost profilů
                    a zpřehlednit nabídku poskytovatelů.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl">📋</div>
                <div>
                  <h3 className="font-semibold">Co zatím dělat</h3>
                  <p className="text-sm text-gray-600">
                    Pro tuto chvíli stačí doplnit profil a sledovat další vývoj.
                    Jakmile bude verifikace spuštěna, zobrazíme přesný postup.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/dashboard/fachman"
                className="block w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 text-center"
              >
                Zpět na dashboard
              </Link>
              <Link
                href="/dashboard/profil"
                className="block w-full bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold text-lg hover:bg-gray-200 text-center"
              >
                Doplnit profil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
