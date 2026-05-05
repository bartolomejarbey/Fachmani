"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import IcoInput from "@/app/components/IcoInput";
import VerifiedBadge from "@/app/components/VerifiedBadge";

type Profile = {
  id: string;
  role: string;
  is_verified: boolean;
  ico: string | null;
  ares_verified_at: string | null;
  ares_verified_name: string | null;
};

export default function Overeni() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ico, setIco] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, role, is_verified, ico, ares_verified_at, ares_verified_name")
        .eq("id", user.id)
        .single();
      if (!data) {
        router.push("/auth/login");
        return;
      }
      if (data.role !== "provider") {
        router.push("/dashboard");
        return;
      }
      setProfile(data as Profile);
      setIco(data.ico || "");
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const alreadyVerifiedAres = !!profile?.ares_verified_at;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-12">
        <Link
          href="/dashboard/fachman"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-cyan-600 mb-4 transition-colors"
        >
          ← Zpět na dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ověření účtu</h1>
        <p className="text-gray-600 mb-8">
          Ověřte svůj subjekt proti ARES — zvýšíte tím důvěryhodnost svého profilu
          a zákazníci uvidí odznak „Ověřeno".
        </p>

        {profile?.is_verified && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 mb-6">
            <div className="flex items-center gap-3">
              <VerifiedBadge verified source={alreadyVerifiedAres ? "ares" : "manual"} />
              <div className="text-sm">
                <div className="font-bold text-gray-900">
                  Váš účet je plně ověřen
                </div>
                <div className="text-gray-600">
                  Můžete posílat nabídky bez omezení.
                </div>
              </div>
            </div>
          </div>
        )}

        {alreadyVerifiedAres && !profile?.is_verified && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-sm text-blue-800">
            ARES ověření bylo úspěšné (<strong>{profile?.ares_verified_name}</strong>).
            Finální schválení provádí administrátor.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">Ověření IČO v ARES</h2>
          <p className="text-sm text-gray-600">
            Zadejte osmimístné IČO a klikněte „Ověřit v ARES". Data získáme
            z veřejného registru Ministerstva financí ČR. Po úspěšném ověření se
            uloží název subjektu z ARES do vašeho profilu.
          </p>

          <IcoInput
            value={ico}
            onChange={setIco}
            persistToProfile
            onVerified={(r) => {
              setMessage(`ARES ověření uloženo do profilu: ${r.name}`);
              setProfile((p) =>
                p
                  ? {
                      ...p,
                      ico: r.ico,
                      ares_verified_name: r.name,
                      ares_verified_at: new Date().toISOString(),
                    }
                  : p
              );
            }}
          />

          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              ✓ {message}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Rate-limit: max 10 dotazů/min z jedné IP, 30 dotazů/min pro přihlášeného
          uživatele. Výsledky jsou cachované 30 dní.
        </div>
      </div>

      <Footer />
    </div>
  );
}
