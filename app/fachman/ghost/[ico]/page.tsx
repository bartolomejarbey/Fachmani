import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");

// SSR vyžadováno smlouvou (SEO crawl). Ghost subjekty (~290k) potřebují individuální URL
// indexovatelnou Googlem — proto generateMetadata + JSON-LD Organization markup.
export const dynamic = "force-dynamic";

type Params = Promise<{ ico: string }>;

type GhostRow = {
  ico: string;
  name: string;
  legal_form: string | null;
  cz_nace: string[] | null;
  category_ids: string[] | null;
  region_id: string | null;
  district_id: string | null;
  legal_address: {
    street?: string;
    house_number?: string;
    city?: string;
    postal_code?: string;
  } | null;
  datum_vzniku: string | null;
  claimed_at: string | null;
  gdpr_suppressed: boolean | null;
};

async function fetchGhost(ico: string): Promise<GhostRow | null> {
  if (!/^[0-9]{8}$/.test(ico)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("ghost_subjects")
    .select("ico, name, legal_form, cz_nace, category_ids, region_id, district_id, legal_address, datum_vzniku, claimed_at, gdpr_suppressed")
    .eq("ico", ico)
    .maybeSingle();
  return (data as GhostRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ico } = await params;
  const ghost = await fetchGhost(ico);
  if (!ghost) {
    return { title: "Subjekt nenalezen | Fachmani", robots: { index: false, follow: false } };
  }
  // A.F6 — gdpr_suppressed: noindex + minimal title.
  if (ghost.gdpr_suppressed) {
    return {
      title: "Profil byl odstraněn | Fachmani",
      robots: { index: false, follow: false },
    };
  }
  const city = ghost.legal_address?.city ?? null;
  const titleBase = `${ghost.name} (IČO ${ghost.ico})`;
  const title = city ? `${titleBase} — ${city}` : titleBase;
  // Bez koncové tečky v segmentech — join " · " pak nedělá doubled-period.
  const descParts = [
    ghost.legal_form,
    city ? `sídlo ${city}` : null,
    "poptejte přes Fachmani",
  ].filter(Boolean);
  const description = descParts.join(" · ");
  return {
    title: `${title} | Fachmani`,
    description,
    alternates: { canonical: `/fachman/ghost/${ghost.ico}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE_URL}/fachman/ghost/${ghost.ico}`,
    },
  };
}

export default async function GhostFachmanPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ from?: string }>;
}) {
  const { ico } = await params;
  const { from } = await searchParams;
  const backHref = from && from.startsWith("/fachmani") ? from : "/fachmani";
  const ghost = await fetchGhost(ico);
  if (!ghost) notFound();

  // A.F6 — GDPR suppress: ukáž minimální stránku bez dat o subjektu.
  if (ghost.gdpr_suppressed) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <section className="pt-32 pb-24">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Profil byl odstraněn</h1>
              <p className="text-gray-600 mb-2">
                Na žádost subjektu byly informace o IČO {ico} z této platformy odstraněny v souladu
                s GDPR čl. 21 (právo vznést námitku proti zpracování).
              </p>
              <p className="text-sm text-gray-500">
                Veřejně dostupná data jsou nadále k dispozici v{" "}
                <a
                  href={`https://ares.gov.cz/ekonomicke-subjekty?ico=${ico}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-700 hover:underline"
                >
                  rejstříku ARES
                </a>.
              </p>
            </div>
            <Link href={backHref} className="inline-block mt-8 text-cyan-700 hover:underline">
              ← Zpět na seznam fachmanů
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const supabase = await createSupabaseServer();

  // Lookup data — paralelně.
  const catIds = ghost.category_ids ?? [];
  const [categoriesRes, regionRes, districtRes, userRes] = await Promise.all([
    catIds.length > 0
      ? supabase.from("categories").select("id, name, icon").in("id", catIds)
      : Promise.resolve({ data: [] as { id: string; name: string; icon: string }[] }),
    ghost.region_id
      ? supabase.from("regions").select("id, name_cs").eq("id", ghost.region_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ghost.district_id
      ? supabase.from("districts").select("id, name_cs").eq("id", ghost.district_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);

  const categories = (categoriesRes.data ?? []) as { id: string; name: string; icon: string }[];
  const region = regionRes.data as { id: string; name_cs: string } | null;
  const district = districtRes.data as { id: string; name_cs: string } | null;

  // Pokud je user logged in a má stejné IČO jako ghost, ukážeme rovnou tlačítko převzetí.
  const user = userRes.data?.user ?? null;
  let userIco: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("ico")
      .eq("id", user.id)
      .maybeSingle();
    userIco = (profile as { ico: string | null } | null)?.ico ?? null;
  }
  const isOwner = !!userIco && userIco === ghost.ico;

  const claimHref = user
    ? `/dashboard/profil?claimIco=${ghost.ico}`
    : `/prihlaseni?next=${encodeURIComponent(`/fachman/ghost/${ghost.ico}`)}`;

  const addressLine = ghost.legal_address
    ? [
        ghost.legal_address.street,
        ghost.legal_address.house_number,
        ghost.legal_address.postal_code,
        ghost.legal_address.city,
      ].filter(Boolean).join(" ")
    : null;

  // JSON-LD: Organization schema pro každý ARES subjekt.
  // Google to umí mappovat na Knowledge Graph + obohatit search results o adresu/založení.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ghost.name,
    identifier: ghost.ico,
    url: `${SITE_URL}/fachman/ghost/${ghost.ico}`,
    ...(ghost.datum_vzniku ? { foundingDate: ghost.datum_vzniku } : {}),
    ...(addressLine ? {
      address: {
        "@type": "PostalAddress",
        streetAddress: [ghost.legal_address?.street, ghost.legal_address?.house_number].filter(Boolean).join(" ") || undefined,
        postalCode: ghost.legal_address?.postal_code || undefined,
        addressLocality: ghost.legal_address?.city || undefined,
        addressCountry: "CZ",
      },
    } : {}),
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="pt-32 pb-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700">
            ← Zpět na seznam
          </Link>

          <div className="mt-6 flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-4xl text-white font-bold">
                {ghost.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{ghost.name}</h1>
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
          {/* Owner-only mini banner — fachman vidí, ostatní ne */}
          {isOwner && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex items-center gap-4">
              <span className="text-2xl">✋</span>
              <div className="flex-1">
                <p className="font-semibold text-emerald-900">Toto je váš profil — můžete ho spravovat.</p>
                <p className="text-sm text-emerald-800">Doplňte fotky, ceník a popis služeb.</p>
              </div>
              <Link
                href={claimHref}
                className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex-shrink-0"
              >
                Spravovat profil
              </Link>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Kontaktní údaje</h3>
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
              </dl>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Obory</h3>
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

          {/* GDPR / A.F6 — schované v collapsoru, default zavřené, dole stránky.
              Právně NUTNÉ zachovat (oprávněný zájem GDPR čl. 6/1/f + opt-out čl. 21).
              UI ale schválně decentní, aby visitor na první dobrou viděl normální profil. */}
          {!isOwner && (
            <details className="mt-16 text-xs text-gray-400">
              <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">
                Informace o profilu
              </summary>
              <div className="mt-3 space-y-2 pl-4 border-l border-gray-200">
                <p>
                  Údaje na této stránce o subjektu {ghost.name} (IČO {ghost.ico})
                  pocházejí z veřejných rejstříků ČR (zákon č. 304/2013 Sb., zákon
                  č. 455/1991 Sb.) a jejich zpracování probíhá v souladu s GDPR čl. 6
                  odst. 1 písm. f).{" "}
                  <a
                    href={`https://ares.gov.cz/ekonomicke-subjekty?ico=${ghost.ico}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 underline"
                  >
                    Zdroj
                  </a>
                  .
                </p>
                <p>
                  Pokud jste zástupce této firmy a chcete profil spravovat nebo
                  vyřadit, použijte{" "}
                  <Link
                    href={claimHref}
                    className="text-gray-500 hover:text-gray-700 underline"
                  >
                    správu profilu
                  </Link>
                  {" "}nebo{" "}
                  <Link
                    href={`/gdpr/opt-out?ico=${ghost.ico}`}
                    className="text-gray-500 hover:text-gray-700 underline"
                  >
                    formulář pro vyřazení
                  </Link>
                  . Kontakt:{" "}
                  <a
                    href="mailto:gdpr@fachmani.org"
                    className="text-gray-500 hover:text-gray-700 underline"
                  >
                    gdpr@fachmani.org
                  </a>
                  .
                </p>
              </div>
            </details>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
