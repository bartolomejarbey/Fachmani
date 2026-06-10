import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import CategoryIcon from "@/app/components/CategoryIcon";
import { formatLocation } from "@/app/types/location";
import { isIosAppRequest } from "@/lib/native-server";
import ReportButton from "@/app/components/ReportButton";
import BlockButton from "@/app/components/BlockButton";
import { safeJsonLd } from "@/lib/jsonLd";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");

// SSR vyžadováno smlouvou. Detail kombinuje real (`uuid`) i seed (`seed_<id>`) profily.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type Category = { id: string; name: string; icon: string };
type Review = {
  id: string;
  rating: number;
  comment: string;
  customer_name: string;
  customer_id?: string | null;
  created_at: string;
};

type RatingBreakdown = {
  quality: number | null;
  communication: number | null;
  price: number | null;
  dim_count: number;
};

type FachmanDetail = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  bank_verified: boolean;
  subscription_type: string;
  bio: string | null;
  description: string | null;
  location: string | null;
  region_name: string | null;
  district_name: string | null;
  ico: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  avatar_url: string | null;
  categories: Category[];
  rating: number;
  review_count: number;
  reviews: Review[];
  rating_breakdown: RatingBreakdown;
  is_seed: boolean;
  has_promo: boolean;
  promo_type: string | null;
  created_at: string;
};

async function fetchFachman(id: string): Promise<FachmanDetail | null> {
  const supabase = await createSupabaseServer();
  const isSeed = id.startsWith("seed_");
  const realId = isSeed ? id.replace("seed_", "") : id;

  // App Store: fiktivní (seed) profily se v iOS aplikaci nezobrazují → 404.
  if (isSeed && (await isIosAppRequest())) return null;

  if (isSeed) {
    const { data: seedData } = await supabase
      .from("seed_providers")
      .select("*")
      .eq("id", realId)
      .maybeSingle();
    if (!seedData) return null;

    const catIds: string[] = (seedData.category_ids as string[] | null) ?? [];
    const [catRes, revRes] = await Promise.all([
      catIds.length > 0
        ? supabase.from("categories").select("id, name, icon").in("id", catIds)
        : Promise.resolve({ data: [] as Category[] }),
      supabase
        .from("seed_reviews")
        .select("id, rating, comment, customer_name, display_date")
        .eq("provider_id", realId)
        .order("display_date", { ascending: false }),
    ]);

    const reviews: Review[] = (revRes.data ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? "",
      customer_name: r.customer_name,
      created_at: r.display_date,
    }));

    return {
      id: `seed_${seedData.id}`,
      full_name: seedData.full_name,
      email: seedData.email ?? null,
      phone: seedData.phone ?? null,
      is_verified: seedData.is_verified,
      bank_verified: false,
      subscription_type: "premium",
      bio: seedData.bio ?? null,
      description: seedData.description ?? null,
      location: seedData.location ?? null,
      region_name: null,
      district_name: null,
      ico: null,
      avatar_url: seedData.avatar_url ?? null,
      hourly_rate: seedData.hourly_rate ?? null,
      locations: seedData.locations ?? null,
      categories: (catRes.data ?? []) as Category[],
      rating: seedData.rating ?? 0,
      review_count: seedData.review_count ?? 0,
      reviews,
      rating_breakdown: { quality: null, communication: null, price: null, dim_count: 0 },
      is_seed: true,
      has_promo: true,
      promo_type: "top_profile",
      created_at: seedData.created_at,
    };
  }

  // Real profil — UUID v `id`.
  // `region` / `district` jako nested select vrací jeden record (singular FK relace).
  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, description, location, ico, avatar_url, is_verified, bank_verification_status, subscription_type, created_at, region:region_id(name_cs), district:district_id(name_cs)",
    )
    .eq("id", realId)
    .maybeSingle();

  if (!profileData) return null;

  const [providerProfileRes, providerCategoriesRes, reviewsRes, promoRes, phoneRes] = await Promise.all([
    supabase.from("provider_profiles").select("bio, hourly_rate, locations").eq("user_id", realId).maybeSingle(),
    supabase.from("provider_categories").select("categories(id, name, icon)").eq("provider_id", realId),
    supabase
      .from("reviews")
      .select("id, rating, rating_quality, rating_communication, rating_price, comment, created_at, customer_id, profiles:customer_id(full_name)")
      .eq("provider_id", realId)
      .order("created_at", { ascending: false }),
    supabase
      .from("promotions")
      .select("type")
      .eq("provider_id", realId)
      .eq("status", "active")
      .gte("ends_at", new Date().toISOString())
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_provider_phone", { p_provider_id: realId }),
  ]);

  const reviewsRaw = (reviewsRes.data ?? []) as Array<{
    id: string;
    rating: number;
    rating_quality: number | null;
    rating_communication: number | null;
    rating_price: number | null;
    comment: string | null;
    created_at: string;
    customer_id: string | null;
    profiles: { full_name?: string } | null;
  }>;

  const reviews: Review[] = reviewsRaw.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? "",
    customer_name: r.profiles?.full_name ?? "Zákazník",
    customer_id: r.customer_id ?? null,
    created_at: r.created_at,
  }));

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  // 3-D rozpad — průměr jen z reviews které mají dimenze (legacy bez nich přeskočíme).
  const dimReviews = reviewsRaw.filter(
    (r) => r.rating_quality !== null && r.rating_communication !== null && r.rating_price !== null,
  );
  const avgDim = (key: "rating_quality" | "rating_communication" | "rating_price") =>
    dimReviews.length > 0
      ? Math.round((dimReviews.reduce((s, r) => s + (r[key] ?? 0), 0) / dimReviews.length) * 10) / 10
      : null;
  const ratingBreakdown: RatingBreakdown = {
    quality: avgDim("rating_quality"),
    communication: avgDim("rating_communication"),
    price: avgDim("rating_price"),
    dim_count: dimReviews.length,
  };

  const regionName = (profileData.region as { name_cs?: string } | null)?.name_cs ?? null;
  const districtName = (profileData.district as { name_cs?: string } | null)?.name_cs ?? null;

  return {
    id: profileData.id,
    full_name: profileData.full_name,
    email: profileData.email,
    phone: (phoneRes.data as string | null) ?? null,
    is_verified: profileData.is_verified,
    bank_verified: (profileData as { bank_verification_status?: string | null }).bank_verification_status === "verified",
    subscription_type: profileData.subscription_type ?? "free",
    bio: providerProfileRes.data?.bio ?? null,
    description: profileData.description ?? null,
    location: profileData.location ?? null,
    region_name: regionName,
    district_name: districtName,
    ico: profileData.ico ?? null,
    avatar_url: profileData.avatar_url ?? null,
    hourly_rate: providerProfileRes.data?.hourly_rate ?? null,
    locations: providerProfileRes.data?.locations ?? null,
    categories: (providerCategoriesRes.data ?? []).flatMap((pc) => {
      const cat = (pc as unknown as { categories: Category | null }).categories;
      return cat ? [cat] : [];
    }),
    rating: avgRating,
    review_count: reviews.length,
    reviews,
    rating_breakdown: ratingBreakdown,
    is_seed: false,
    has_promo: !!promoRes.data,
    promo_type: promoRes.data?.type ?? null,
    created_at: profileData.created_at,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const fachman = await fetchFachman(id);
  if (!fachman) {
    return { title: "Fachman nenalezen | Fachmani", robots: { index: false, follow: false } };
  }
  const catNames = fachman.categories.slice(0, 3).map((c) => c.name).join(", ");
  const titleBase = catNames ? `${fachman.full_name} — ${catNames}` : fachman.full_name;
  const locationLabel = formatLocation(fachman.region_name, fachman.district_name)
    || (fachman.locations && fachman.locations.length > 0 ? fachman.locations[0] : null);
  const title = locationLabel ? `${titleBase} (${locationLabel})` : titleBase;
  const descBase = (fachman.bio ?? fachman.description ?? "").trim().slice(0, 180);
  const descParts = [
    descBase || `Profesionál ${fachman.full_name}`,
    catNames ? `Obory: ${catNames}` : null,
    locationLabel ? `Lokalita: ${locationLabel}` : null,
  ].filter(Boolean);
  return {
    title: `${title} | Fachmani`,
    description: descParts.join(" · "),
    alternates: { canonical: `/fachman/${fachman.id}` },
    openGraph: {
      title,
      description: descParts.join(" · "),
      type: "profile",
      url: `${SITE_URL}/fachman/${fachman.id}`,
      ...(fachman.avatar_url ? { images: [{ url: fachman.avatar_url }] } : {}),
    },
  };
}

export default async function FachmanDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // Zachová stránku/filtry, ze kterých uživatel přišel; jinak zpět na výpis.
  const backHref = from && from.startsWith("/fachmani") ? from : "/fachmani";
  const { id } = await params;
  const fachman = await fetchFachman(id);
  if (!fachman) notFound();

  const isPremium = fachman.subscription_type === "premium" || fachman.subscription_type === "business";
  const isTopProfile = fachman.has_promo && fachman.promo_type === "top_profile";

  // B.F2 — direct chat tlačítko jen když je přihlášený provider a kouká na jiného (nesedového) providera
  let canDirectMessage = false;
  if (!fachman.is_seed) {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id !== fachman.id) {
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const myRole = (meProfile as { role: string | null } | null)?.role ?? null;
      // Druhý uživatel musí mít taky role='provider' — kouknu rovnou v profilu
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", fachman.id)
        .maybeSingle();
      const otherRole = (otherProfile as { role: string | null } | null)?.role ?? null;
      canDirectMessage = myRole === "provider" && otherRole === "provider";
    }
  }

  const locationPrimary = formatLocation(fachman.region_name, fachman.district_name);
  const locationFallback = locationPrimary
    || fachman.location
    || (fachman.locations && fachman.locations.length > 0 ? fachman.locations.join(", ") : null);

  // JSON-LD ProfilePage + Person — Google obohatí výsledek o rating, lokaci a obor.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: fachman.full_name,
      url: `${SITE_URL}/fachman/${fachman.id}`,
      ...(fachman.avatar_url ? { image: fachman.avatar_url } : {}),
      ...(fachman.bio || fachman.description ? { description: fachman.bio ?? fachman.description } : {}),
      ...(locationFallback ? {
        address: {
          "@type": "PostalAddress",
          addressLocality: locationFallback,
          addressCountry: "CZ",
        },
      } : {}),
      ...(fachman.categories.length > 0 ? {
        knowsAbout: fachman.categories.map((c) => c.name),
      } : {}),
      ...(fachman.review_count > 0 ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: fachman.rating,
          reviewCount: fachman.review_count,
          bestRating: 5,
          worstRating: 1,
        },
      } : {}),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <section className="relative pt-28 pb-12 bg-white border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 mb-6 transition-colors"
          >
            ← Zpět na seznam
          </Link>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative">
              {fachman.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fachman.avatar_url}
                  alt={fachman.full_name}
                  className={`w-32 h-32 rounded-3xl object-cover ${
                    isTopProfile
                      ? "ring-4 ring-yellow-400"
                      : isPremium
                      ? "ring-4 ring-cyan-300"
                      : ""
                  }`}
                />
              ) : (
                <div
                  className={`w-32 h-32 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-3xl flex items-center justify-center ${
                    isTopProfile
                      ? "ring-4 ring-yellow-400"
                      : isPremium
                      ? "ring-4 ring-cyan-300"
                      : ""
                  }`}
                >
                  <span className="text-5xl text-white font-bold">
                    {fachman.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isTopProfile && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                  🚀 Top
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{fachman.full_name}</h1>
                {fachman.is_verified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Ověřený
                  </span>
                )}
                {fachman.bank_verified && (
                  <span
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                    title="Reálný bankovní účet ověřen 1 Kč platbou"
                  >
                    💳 Ověřeno bankou
                  </span>
                )}
                {isPremium && (
                  <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-medium">
                    ⭐ Premium
                  </span>
                )}
                {!fachman.is_verified && !fachman.is_seed && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-medium border border-orange-200">
                    Neověřeno
                  </span>
                )}
              </div>

              {fachman.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= Math.round(fachman.rating) ? "text-yellow-400" : "text-gray-300"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">{fachman.rating}</span>
                  <span className="text-gray-500">({fachman.review_count} hodnocení)</span>
                </div>
              )}

              {fachman.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {fachman.categories.map((cat) => (
                    <span key={cat.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm inline-flex items-center gap-1">
                      <CategoryIcon icon={cat.icon} size={14} />{cat.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-gray-600">
                {locationPrimary ? (
                  <span className="flex items-center gap-1">📍 {locationPrimary}</span>
                ) : fachman.locations && fachman.locations.length > 0 ? (
                  <span className="flex items-center gap-1">📍 {fachman.locations.join(", ")}</span>
                ) : null}
                {fachman.hourly_rate && (
                  <span className="flex items-center gap-1">
                    💰 od <strong className="text-gray-900">{fachman.hourly_rate} Kč</strong>/hod
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="py-6 border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">📍 Lokalita</p>
              <p className="font-semibold text-gray-900 text-sm">
                {locationFallback || "Lokalita neuvedena"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">📞 Telefon</p>
              <p className="font-semibold text-gray-900 text-sm">{fachman.phone || "Neuvedeno"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">💰 Hodinová sazba</p>
              <p className="font-semibold text-gray-900 text-sm">
                {fachman.hourly_rate ? `${fachman.hourly_rate} Kč/hod` : "Dle dohody"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">🏢 IČO</p>
              <p className="font-semibold text-gray-900 text-sm">{fachman.ico || "Neuvedeno"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">O mně</h2>
                <p className="text-gray-600 whitespace-pre-line">
                  {fachman.bio || fachman.description || "Tento fachman ještě nepřidal popis."}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Hodnocení ({fachman.review_count})
                </h2>

                {fachman.rating_breakdown.dim_count > 0 && (
                  <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-3 text-center">
                    {([
                      { key: "quality", label: "Kvalita", value: fachman.rating_breakdown.quality },
                      { key: "communication", label: "Komunikace", value: fachman.rating_breakdown.communication },
                      { key: "price", label: "Cena", value: fachman.rating_breakdown.price },
                    ] as const).map((d) => (
                      <div key={d.key}>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{d.label}</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-bold text-gray-900">
                            {d.value !== null ? d.value.toFixed(1) : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fachman.reviews.length === 0 ? (
                  <p className="text-gray-500">Zatím žádná hodnocení.</p>
                ) : (
                  <div className="space-y-4">
                    {fachman.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                              {review.customer_name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{review.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-sm ${
                                  star <= review.rating ? "text-yellow-400" : "text-gray-300"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 text-sm">{review.comment}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-gray-400 text-xs">
                            {new Date(review.created_at).toLocaleDateString("cs-CZ")}
                          </p>
                          <ReportButton
                            targetType="review"
                            targetId={review.id}
                            targetOwnerId={review.customer_id ?? null}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Kontaktovat</h3>

                <Link
                  href="/nova-poptavka"
                  className="block w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all mb-4"
                >
                  📝 Zadat poptávku
                </Link>

                {canDirectMessage && (
                  <Link
                    href={`/zpravy/direct/${fachman.id}`}
                    className="block w-full text-center bg-white border-2 border-cyan-500 text-cyan-600 py-3 rounded-xl font-semibold hover:bg-cyan-50 transition-all mb-3"
                  >
                    💬 Napsat zprávu
                  </Link>
                )}

                {fachman.phone && (
                  <a
                    href={`tel:${fachman.phone}`}
                    className="block w-full text-center border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:border-cyan-500 hover:text-cyan-600 transition-all mb-3"
                  >
                    📞 {fachman.phone}
                  </a>
                )}

                <p className="text-gray-500 text-sm text-center mt-4">
                  Registrován od {new Date(fachman.created_at).toLocaleDateString("cs-CZ")}
                </p>

                {/* App Store 1.2 — nahlášení / blokování uživatele (jen reálné profily) */}
                {!fachman.id.startsWith("seed_") && (
                  <div className="mt-4 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
                    <ReportButton
                      targetType="profile"
                      targetId={fachman.id}
                      targetOwnerId={fachman.id}
                      label="Nahlásit profil"
                    />
                    <BlockButton targetUserId={fachman.id} targetName={fachman.full_name} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
