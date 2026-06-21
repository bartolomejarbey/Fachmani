"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

/**
 * /onboarding
 * ===========
 * Jednoduchá uvítací stránka po nové registraci. Zobrazí se při prvním vstupu
 * (profiles.onboarded_at IS NULL → gate v /dashboard a /dashboard/fachman).
 * Tlačítko „Jdeme na to" nastaví onboarded_at a přesměruje dál.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [name, setName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, onboarded_at")
        .eq("id", user.id)
        .single();
      if (profile?.onboarded_at) {
        // Už proběhlo — neukazuj znovu.
        router.replace(profile.role === "provider" ? "/dashboard/fachman" : "/dashboard");
        return;
      }
      if (profile?.role === "provider") setRole("provider");
      setName((profile?.full_name || "").split(" ")[0] || "");
      setReady(true);
    })();
  }, [router]);

  const finish = async (destination: string) => {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    router.push(destination);
  };

  const isProvider = role === "provider";
  const primaryHref = isProvider ? "/dashboard/fachman" : "/nova-poptavka";
  const primaryLabel = isProvider ? "Nastavit profil a reagovat na poptávky" : "Zadat první poptávku";

  const steps = isProvider
    ? [
        { icon: "📝", title: "Vyplňte profil", desc: "Doplňte obory, lokalitu a popis. Ověřený profil (identita + bankovní účet) získá modrý odznak a víc důvěry." },
        { icon: "🔔", title: "Reagujte na poptávky", desc: "Procházejte veřejné poptávky ve svých oborech a posílejte zákazníkům nabídky." },
        { icon: "🤝", title: "Získávejte zakázky", desc: "Domluvte se přímo se zákazníkem. Po dokončení vám může napsat recenzi a posílit váš profil." },
      ]
    : [
        { icon: "✍️", title: "Zadejte poptávku", desc: "Zdarma popíšete, co potřebujete, kde a s jakým rozpočtem. Zabere to minutu." },
        { icon: "📬", title: "Dostanete nabídky", desc: "Ověření fachmani z oboru vám pošlou nabídky s cenou a termínem." },
        { icon: "⭐", title: "Vyberte si a ohodnoťte", desc: "Vyberete si nejlepší nabídku, domluvíte detaily a po dokončení napíšete recenzi." },
      ];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/* Hlavička */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Fachmani"
            width={853}
            height={293}
            className="mx-auto mb-6 h-12 w-auto"
            priority
          />
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Vítejte{name ? `, ${name}` : ""} na Fachmani 👋
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
            {isProvider
              ? "Jste pár kroků od prvních zakázek. Tady je, jak to celé funguje."
              : "Najít spolehlivého fachmana je tu otázka chvilky. Pojďme si rychle ukázat, jak na to."}
          </p>
        </div>

        {/* Kroky */}
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 text-2xl">
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-600">KROK {i + 1}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Garance */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 p-6 text-white shadow-lg shadow-cyan-500/20">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🛡️</span>
            <div>
              <h3 className="text-lg font-bold">Naše garance odezvy</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/90">
                Garantujeme, že na vaši poptávku dostanete odpověď{" "}
                <strong className="font-bold">do 7 dnů</strong>. U{" "}
                <strong className="font-bold">urgentních</strong> poptávek se ozveme{" "}
                <strong className="font-bold">do 48 hodin</strong>. Když ne, ozvěte se nám — pomůžeme.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => finish(primaryHref)}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 text-center text-lg font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
          >
            {saving ? "Moment…" : primaryLabel} →
          </button>
          <button
            onClick={() => finish(isProvider ? "/dashboard/fachman" : "/dashboard")}
            disabled={saving}
            className="w-full rounded-2xl px-6 py-3 text-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-60"
          >
            Přeskočit do přehledu
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Potřebujete poradit? Napište nám na{" "}
          <Link href="/kontakt" className="font-medium text-cyan-600 hover:underline">
            kontakt
          </Link>{" "}
          nebo se zeptejte našeho asistenta Fachmánka 💬
        </p>
      </div>
    </div>
  );
}
