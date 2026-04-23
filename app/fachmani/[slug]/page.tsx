import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import VerifiedBadge from "@/app/components/VerifiedBadge";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://fachmani.org";

type Category = { id: string; name: string; icon: string };

type DetailData = {
  id: string;
  slug: string;
  full_name: string;
  is_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  description: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
  location: string | null;
  categories: Category[];
  rating: number;
  review_count: number;
  reviews: { id: string; rating: number; comment: string | null; customer_name: string; created_at: string }[];
  subscription_type: string;
  is_seed: boolean;
  has_promo: boolean;
  promo_type: string | null;
};

async function loadBySlug(slug: string): Promise<DetailData | null> {
  const supabase = await createSupabaseServer();

  // 1. Reální provider
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, is_verified, subscription_type, description, location, slug"
    )
    .eq("slug", slug)
    .eq("role", "provider")
    .maybeSingle();

  if (profile) {
    const [{ data: pp }, { data: pc }, { data: reviewsData }, { data: promo }] = await Promise.all([
      supabase.from("provider_profiles").select("id, bio, hourly_rate, locations").eq("user_id", profile.id).maybeSingle(),
      supabase.from("provider_categories").select("categories(id, name, icon)").eq("provider_id", profile.id),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles:customer_id(full_name)")
        .eq("provider_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("promotions")
        .select("type")
        .eq("provider_id", profile.id)
        .eq("status", "active")
        .gte("ends_at", new Date().toISOString())
        .maybeSingle(),
    ]);

    const reviews = (reviewsData || []).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      customer_name:
        (r.profiles as unknown as { full_name?: string } | null)?.full_name || "Zákazník",
      created_at: r.created_at,
    }));
    const rating =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    const categories = (pc || []).flatMap((row) => {
      const c = (row as unknown as { categories: Category | null }).categories;
      return c ? [c] : [];
    });

    return {
      id: profile.id,
      slug: profile.slug || profile.id,
      full_name: profile.full_name,
      is_verified: !!profile.is_verified,
      avatar_url: profile.avatar_url,
      bio: pp?.bio || null,
      description: profile.description || null,
      hourly_rate: pp?.hourly_rate ?? null,
      locations: pp?.locations || null,
      location: profile.location || null,
      categories,
      rating,
      review_count: reviews.length,
      reviews,
      subscription_type: profile.subscription_type || "free",
      is_seed: false,
      has_promo: !!promo,
      promo_type: promo?.type || null,
    };
  }

  // 2. Seed provider
  const { data: seed } = await supabase
    .from("seed_providers")
    .select(
      "id, full_name, avatar_url, is_verified, bio, hourly_rate, locations, category_ids, rating, review_count, slug"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (seed) {
    const [{ data: cats }, { data: seedReviews }] = await Promise.all([
      supabase.from("categories").select("id, name, icon").in("id", (seed.category_ids as string[] | null) || []),
      supabase
        .from("seed_reviews")
        .select("id, rating, comment, customer_name, display_date")
        .eq("provider_id", seed.id)
        .order("display_date", { ascending: false })
        .limit(20),
    ]);

    return {
      id: seed.id,
      slug: seed.slug || `seed-${seed.id}`,
      full_name: seed.full_name,
      is_verified: !!seed.is_verified,
      avatar_url: seed.avatar_url || null,
      bio: seed.bio,
      description: null,
      hourly_rate: seed.hourly_rate,
      locations: seed.locations,
      location: null,
      categories: (cats as Category[] | null) || [],
      rating: seed.rating || 0,
      review_count: seed.review_count || 0,
      reviews: (seedReviews || []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customer_name: r.customer_name,
        created_at: r.display_date,
      })),
      subscription_type: "premium",
      is_seed: true,
      has_promo: true,
      promo_type: "top_profile",
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadBySlug(slug);
  if (!data) {
    return { title: "Fachman nenalezen | Fachmani" };
  }
  const locationLabel = data.locations?.join(", ") || data.location || "";
  const catsLabel = data.categories.map((c) => c.name).join(", ");
  const descParts = [data.bio || data.description, catsLabel, locationLabel].filter(Boolean);
  const description = descParts.join(" · ").slice(0, 160);
  return {
    title: `${data.full_name} | Fachmani`,
    description: description || `Profil ${data.full_name} na Fachmani.`,
    alternates: { canonical: `${SITE_URL}/fachmani/${data.slug}` },
    openGraph: {
      title: data.full_name,
      description,
      url: `${SITE_URL}/fachmani/${data.slug}`,
      images: data.avatar_url ? [{ url: data.avatar_url }] : undefined,
      type: "profile",
    },
  };
}

export default async function FachmanDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadBySlug(slug);
  if (!data) notFound();

  const isPremium = data.subscription_type === "premium" || data.subscription_type === "business";
  const isTopProfile = data.has_promo && data.promo_type === "top_profile";

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: data.full_name,
      image: data.avatar_url || undefined,
      description: data.bio || data.description || undefined,
      url: `${SITE_URL}/fachmani/${data.slug}`,
      knowsAbout: data.categories.map((c) => c.name),
      address: data.locations?.length
        ? { "@type": "PostalAddress", addressLocality: data.locations.join(", "), addressCountry: "CZ" }
        : undefined,
      ...(data.review_count > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: data.rating,
              reviewCount: data.review_count,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="relative pt-28 pb-12 bg-white border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link href="/fachmani" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 mb-6">
            ← Zpět na seznam
          </Link>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative">
              {data.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatar_url}
                  alt={data.full_name}
                  className={`w-32 h-32 rounded-3xl object-cover ${
                    isTopProfile ? "ring-4 ring-yellow-400" : isPremium ? "ring-4 ring-cyan-300" : ""
                  }`}
                />
              ) : (
                <div
                  className={`w-32 h-32 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-3xl flex items-center justify-center ${
                    isTopProfile ? "ring-4 ring-yellow-400" : isPremium ? "ring-4 ring-cyan-300" : ""
                  }`}
                >
                  <span className="text-5xl text-white font-bold">
                    {data.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isTopProfile && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                  🚀 Top
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{data.full_name}</h1>
                <VerifiedBadge verified={data.is_verified} source="ares" />

              </div>

              {data.rating > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500 text-lg">★</span>
                  <span className="font-semibold text-gray-900">{data.rating}</span>
                  <span className="text-gray-500">({data.review_count} hodnocení)</span>
                </div>
              )}

              {data.hourly_rate && (
                <p className="text-lg text-gray-700 mb-2">
                  od <span className="font-bold text-gray-900">{data.hourly_rate} Kč</span>/hod
                </p>
              )}

              {(data.locations?.length || data.location) && (
                <p className="text-gray-600 mb-2">
                  📍 {data.locations?.join(", ") || data.location}
                </p>
              )}

              {data.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.categories.map((c) => (
                    <span
                      key={c.id}
                      className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                    >
                      {c.icon} {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {data.bio && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-3">O mně</h2>
                <p className="text-gray-700 whitespace-pre-line">{data.bio}</p>
              </div>
            )}

            {data.description && data.description !== data.bio && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Popis</h2>
                <p className="text-gray-700 whitespace-pre-line">{data.description}</p>
              </div>
            )}

            {data.reviews.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Hodnocení ({data.review_count})
                </h2>
                <div className="space-y-4">
                  {data.reviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{r.customer_name}</span>
                        <span className="text-yellow-500">
                          {"★".repeat(r.rating)}
                          <span className="text-gray-200">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
                        </span>
                      </div>
                      {r.comment && <p className="text-gray-700">{r.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(r.created_at).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">Kontakt</h3>
              <p className="text-sm text-gray-600 mb-4">
                Máte zájem? Zadejte poptávku a tento fachman vám pošle nabídku.
              </p>
              <Link
                href="/nova-poptavka"
                className="block w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Zadat poptávku
              </Link>
            </div>

            {data.is_verified && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">Ověřený profil</h3>
                <p className="text-xs text-gray-600">
                  Tento fachman byl ověřen administrátorem platformy.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
    </div>
  );
}
