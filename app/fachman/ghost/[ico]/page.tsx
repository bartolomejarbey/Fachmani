"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type GhostSubject = {
  ico: string;
  name: string;
  legal_form: string | null;
  cz_nace: string[];
  category_ids: string[];
  region_id: string | null;
  district_id: string | null;
  legal_address: {
    street?: string;
    house_number?: string;
    city?: string;
    postal_code?: string;
  } | null;
  datum_vzniku: string | null;
  registration_states: Record<string, string>;
  claimed_at: string | null;
};

type Category = { id: string; name: string; icon: string };
type Region = { id: string; name_cs: string };
type District = { id: string; name_cs: string };

export default function GhostFachmanPage() {
  const params = useParams();
  const router = useRouter();
  const ico = params.ico as string;

  const [ghost, setGhost] = useState<GhostSubject | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [region, setRegion] = useState<Region | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [userIco, setUserIco] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ico || !/^[0-9]{8}$/.test(ico)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    void load();
  }, [ico]);

  async function load() {
    const { data: ghostData } = await supabase
      .from("ghost_subjects")
      .select("*")
      .eq("ico", ico)
      .maybeSingle();

    if (!ghostData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setGhost(ghostData as GhostSubject);

    if (ghostData.category_ids?.length) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name, icon")
        .in("id", ghostData.category_ids);
      if (catData) setCategories(catData);
    }

    if (ghostData.region_id) {
      const { data: r } = await supabase
        .from("regions")
        .select("id, name_cs")
        .eq("id", ghostData.region_id)
        .maybeSingle();
      if (r) setRegion(r);
    }
    if (ghostData.district_id) {
      const { data: d } = await supabase
        .from("districts")
        .select("id, name_cs")
        .eq("id", ghostData.district_id)
        .maybeSingle();
      if (d) setDistrict(d);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("ico")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.ico) setUserIco(profile.ico);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound || !ghost) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Subjekt nenalezen</h1>
          <p className="text-gray-600 mb-8">IČO {ico} v ARES databázi neexistuje, nebo už byl převzat.</p>
          <Link href="/fachmani" className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-xl font-semibold">
            Zpět na seznam
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const addressLine = ghost.legal_address
    ? [
        ghost.legal_address.street,
        ghost.legal_address.house_number,
        ghost.legal_address.postal_code,
        ghost.legal_address.city,
      ].filter(Boolean).join(" ")
    : null;

  const isOwner = userIco === ghost.ico;

  async function handleClaim() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/prihlaseni?next=${encodeURIComponent(`/fachman/ghost/${ico}`)}`);
      return;
    }
    router.push(`/dashboard/profil?claimIco=${ico}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <Link href="/fachmani" className="text-sm text-gray-500 hover:text-gray-700">
            ← Zpět na seznam
          </Link>

          <div className="mt-6 flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-4xl text-gray-500 font-bold">
                {ghost.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{ghost.name}</h1>
                <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-semibold border border-gray-200">
                  Neověřeno (ARES)
                </span>
              </div>
              {ghost.legal_form && (
                <p className="text-gray-600">{ghost.legal_form}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">IČO: {ghost.ico}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-amber-900 mb-2">Tento subjekt na Fachmani zatím nemá aktivní profil</h2>
            <p className="text-sm text-amber-800 mb-4">
              Údaje pocházejí z veřejného rejstříku ARES. Pokud jste majitel nebo zástupce {ghost.name},
              můžete profil převzít a doplnit fotky, ceník a popis vašich služeb.
            </p>
            <button
              onClick={handleClaim}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                isOwner
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-cyan-500 text-white hover:bg-cyan-600"
              }`}
            >
              {isOwner ? "Převzít profil (vaše IČO)" : "Toto je moje firma — převzít profil"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Údaje z ARES</h3>
              <dl className="space-y-2 text-sm">
                {addressLine && (
                  <div>
                    <dt className="text-gray-500">Sídlo</dt>
                    <dd className="text-gray-900">{addressLine}</dd>
                  </div>
                )}
                {(region || district) && (
                  <div>
                    <dt className="text-gray-500">Lokalita</dt>
                    <dd className="text-gray-900">
                      {[district?.name_cs, region?.name_cs].filter(Boolean).join(", ")}
                    </dd>
                  </div>
                )}
                {ghost.datum_vzniku && (
                  <div>
                    <dt className="text-gray-500">Datum vzniku</dt>
                    <dd className="text-gray-900">{ghost.datum_vzniku}</dd>
                  </div>
                )}
                {ghost.cz_nace?.length > 0 && (
                  <div>
                    <dt className="text-gray-500">CZ-NACE</dt>
                    <dd className="text-gray-900 text-xs font-mono">{ghost.cz_nace.join(", ")}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Obory (odhad podle NACE)</h3>
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <span key={c.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                      {c.icon} {c.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Kategorie zatím neurčeny.</p>
              )}
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-cyan-50 to-emerald-50 border border-cyan-100 rounded-2xl p-6 text-center">
            <p className="text-gray-700 mb-4">
              Hledáte řemeslníka v oboru <strong>{ghost.name}</strong>?
            </p>
            <Link
              href={`/nova-poptavka?ghostIco=${ghost.ico}`}
              className="inline-flex items-center gap-2 bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition-all"
            >
              Poptat tohoto fachmana
              {Icons.arrowRight}
            </Link>
            <p className="text-xs text-gray-500 mt-3">
              Náš tým fachmana osobně zkontaktuje a předá poptávku.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
