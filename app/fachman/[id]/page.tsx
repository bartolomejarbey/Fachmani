"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { formatLocation } from "@/app/types/location";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
};

type FachmanDetail = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_verified: boolean;
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
  is_seed: boolean;
  has_promo: boolean;
  promo_type: string | null;
  created_at: string;
};

export default function FachmanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isSeed = id.startsWith("seed_");
  const realId = isSeed ? id.replace("seed_", "") : id;

  const [fachman, setFachman] = useState<FachmanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFachman();
  }, [id]);

  const loadFachman = async () => {
    if (isSeed) {
      const { data: seedData } = await supabase
        .from("seed_providers")
        .select("*")
        .eq("id", realId)
        .single();

      if (seedData) {
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name, icon")
          .in("id", seedData.category_ids || []);

        const { data: seedReviewsData } = await supabase
          .from("seed_reviews")
          .select("*")
          .eq("provider_id", realId)
          .order("display_date", { ascending: false });

        setFachman({
          id: `seed_${seedData.id}`,
          full_name: seedData.full_name,
          email: seedData.email,
          phone: seedData.phone,
          is_verified: seedData.is_verified,
          subscription_type: "premium",
          bio: seedData.bio,
          description: seedData.description || null,
          location: seedData.location || null,
          region_name: null,
          district_name: null,
          ico: null,
          avatar_url: seedData.avatar_url || null,
          hourly_rate: seedData.hourly_rate,
          locations: seedData.locations,
          categories: categoriesData || [],
          rating: seedData.rating || 0,
          review_count: seedData.review_count || 0,
          reviews: (seedReviewsData || []).map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            customer_name: r.customer_name,
            created_at: r.display_date,
          })),
          is_seed: true,
          has_promo: true,
          promo_type: "top_profile",
          created_at: seedData.created_at,
        });
      }
    } else {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, description, location, ico, avatar_url, is_verified, subscription_type, created_at, region:region_id(name_cs), district:district_id(name_cs)")
        .eq("id", realId)
        .single();

      const { data: phoneData } = await supabase
        .rpc("get_provider_phone", { p_provider_id: realId });

      if (profileData) {
        const { data: providerProfileData } = await supabase
          .from("provider_profiles")
          .select("*")
          .eq("user_id", realId)
          .single();

        const { data: providerCategoriesData } = await supabase
          .from("provider_categories")
          .select("categories(id, name, icon)")
          .eq("provider_id", realId);

        const { data: reviewsData } = await supabase
          .from("reviews")
          .select(`
            id,
            rating,
            comment,
            created_at,
            profiles:customer_id (full_name)
          `)
          .eq("provider_id", realId)
          .order("created_at", { ascending: false });

        const { data: promoData } = await supabase
          .from("promotions")
          .select("type")
          .eq("provider_id", realId)
          .eq("status", "active")
          .gte("ends_at", new Date().toISOString())
          .limit(1)
          .single();

        const reviews = (reviewsData || []).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment || "",
          customer_name: (r.profiles as { full_name?: string } | null)?.full_name || "Zákazník",
          created_at: r.created_at,
        }));

        const avgRating =
          reviews.length > 0
            ? Math.round(
                (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
              ) / 10
            : 0;

        const regionName = (profileData.region as { name_cs?: string } | null)?.name_cs ?? null;
        const districtName = (profileData.district as { name_cs?: string } | null)?.name_cs ?? null;

        setFachman({
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          phone: (phoneData as string | null) ?? null,
          is_verified: profileData.is_verified,
          subscription_type: profileData.subscription_type || "free",
          bio: providerProfileData?.bio || null,
          description: profileData.description || null,
          location: profileData.location || null,
          region_name: regionName,
          district_name: districtName,
          ico: profileData.ico || null,
          avatar_url: profileData.avatar_url || null,
          hourly_rate: providerProfileData?.hourly_rate || null,
          locations: providerProfileData?.locations || null,
          categories: (providerCategoriesData || []).flatMap((pc) => {
            const cat = (pc as unknown as { categories: { id: string; name: string; icon: string } | null }).categories;
            return cat ? [cat] : [];
          }),
          rating: avgRating,
          review_count: reviews.length,
          reviews,
          is_seed: false,
          has_promo: !!promoData,
          promo_type: promoData?.type || null,
          created_at: profileData.created_at,
        });
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!fachman) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Fachman nenalezen
            </h2>
            <p className="text-gray-600 mb-6">
              Tento profil neexistuje nebo byl odstraněn.
            </p>
            <Link
              href="/fachmani"
              className="text-cyan-600 font-semibold hover:text-cyan-700"
            >
              ← Zpět na seznam fachmanů
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isPremium =
    fachman.subscription_type === "premium" ||
    fachman.subscription_type === "business";
  const isTopProfile = fachman.has_promo && fachman.promo_type === "top_profile";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="relative pt-28 pb-12 bg-white border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            href="/fachmani"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 mb-6 transition-colors"
          >
            ← Zpět na seznam
          </Link>

          <div
            className={`flex flex-col sm:flex-row gap-6 ${
              mounted ? "animate-fade-in-up" : "opacity-0"
            }`}
          >
            <div className="relative">
              {fachman.avatar_url ? (
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
                <h1 className="text-3xl font-bold text-gray-900">
                  {fachman.full_name}
                </h1>
                {fachman.is_verified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Ověřený
                  </span>
                )}
                {isPremium && (
                  <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-medium">
                    ⭐ Premium
                  </span>
                )}
              </div>

              {fachman.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= Math.round(fachman.rating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">{fachman.rating}</span>
                  <span className="text-gray-500">
                    ({fachman.review_count} hodnocení)
                  </span>
                </div>
              )}

              {fachman.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {fachman.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {cat.icon} {cat.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-gray-600">
                {(() => {
                  const primary = formatLocation(fachman.region_name, fachman.district_name);
                  if (primary) {
                    return <span className="flex items-center gap-1">📍 {primary}</span>;
                  }
                  if (fachman.locations && fachman.locations.length > 0) {
                    return <span className="flex items-center gap-1">📍 {fachman.locations.join(", ")}</span>;
                  }
                  return null;
                })()}
                {fachman.hourly_rate && (
                  <span className="flex items-center gap-1">
                    💰 od{" "}
                    <strong className="text-gray-900">
                      {fachman.hourly_rate} Kč
                    </strong>
                    /hod
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
                {formatLocation(fachman.region_name, fachman.district_name)
                  || fachman.location
                  || (fachman.locations && fachman.locations.length > 0 ? fachman.locations.join(", ") : "Lokalita neuvedena")}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">📞 Telefon</p>
              <p className="font-semibold text-gray-900 text-sm">
                {fachman.phone || "Neuvedeno"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">💰 Hodinová sazba</p>
              <p className="font-semibold text-gray-900 text-sm">
                {fachman.hourly_rate ? `${fachman.hourly_rate} Kč/hod` : "Dle dohody"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">🏢 IČO</p>
              <p className="font-semibold text-gray-900 text-sm">
                {fachman.ico || "Neuvedeno"}
              </p>
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
                            <span className="font-medium text-gray-900">
                              {review.customer_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-sm ${
                                  star <= review.rating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
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
                        <p className="text-gray-400 text-xs mt-2">
                          {new Date(review.created_at).toLocaleDateString("cs-CZ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Kontaktovat
                </h3>

                <Link
                  href="/nova-poptavka"
                  className="block w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all mb-4"
                >
                  📝 Zadat poptávku
                </Link>

                {fachman.phone && (
                  <a href={`tel:${fachman.phone}`} className="block w-full text-center border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:border-cyan-500 hover:text-cyan-600 transition-all mb-3">
                    📞 {fachman.phone}
                  </a>
                )}

                <p className="text-gray-500 text-sm text-center mt-4">
                  Registrován od{" "}
                  {new Date(fachman.created_at).toLocaleDateString("cs-CZ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}