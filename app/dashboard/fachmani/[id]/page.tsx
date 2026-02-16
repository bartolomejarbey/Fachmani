"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  is_verified: boolean;
  subscription_type: string;
  created_at: string;
};

type ProviderProfile = {
  id: string;
  bio: string | null;
  hourly_rate: number | null;
  locations: string[] | null;
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

export default function FachmanProfile() {
  const params = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      // Načteme profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .eq("role", "provider")
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Načteme provider profil
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("user_id", params.id)
        .single();

      if (providerData) {
        setProviderProfile(providerData);

        // Načteme kategorie fachmana pomocí provider_profiles.id
        const { data: categoriesData } = await supabase
          .from("provider_categories")
          .select("categories(id, name, icon)")
          .eq("provider_id", providerData.id);

        if (categoriesData) {
          setCategories(categoriesData.map((c: any) => c.categories).filter(Boolean));
        }
      }

      // Načteme recenze
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*, profiles(full_name)")
        .eq("provider_id", params.id)
        .order("created_at", { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        setReviews(reviewsData as Review[]);
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }

      // Počet dokončených zakázek
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", params.id)
        .eq("status", "accepted");

      setCompletedJobsCount(count || 0);

      setLoading(false);
    }

    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icons.users}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fachman nenalezen</h2>
            <p className="text-gray-600 mb-6">Tento profil neexistuje nebo byl smazán.</p>
            <Link href="/fachmani" className="inline-flex items-center gap-2 text-cyan-600 font-semibold hover:text-cyan-700">
              ← Zpět na seznam fachmanů
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isPremium = profile.subscription_type === "premium" || profile.subscription_type === "business";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero header */}
      <section className="pt-24 pb-12 bg-white border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-emerald-50"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <Link 
              href="/fachmani" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-cyan-600 mb-6 transition-colors"
            >
              ← Zpět na seznam fachmanů
            </Link>

            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className={`w-28 h-28 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-3xl flex items-center justify-center shadow-xl ${isPremium ? 'ring-4 ring-cyan-300' : ''}`}>
                  <span className="text-5xl text-white font-bold">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
                  {profile.is_verified && (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      {Icons.check} Ověřeno
                    </span>
                  )}
                  {isPremium && (
                    <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ⭐ Premium
                    </span>
                  )}
                </div>

                {/* Rating */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 text-yellow-500">
                      {[1,2,3,4,5].map(star => (
                        <span key={star} className={star <= Math.round(averageRating) ? 'text-yellow-500' : 'text-gray-300'}>
                          {Icons.star}
                        </span>
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">{averageRating}</span>
                    <span className="text-gray-500">({reviews.length} hodnocení)</span>
                  </div>
                )}

                {/* Bio */}
                {providerProfile?.bio && (
                  <p className="text-gray-600 mb-4 max-w-2xl">{providerProfile.bio}</p>
                )}

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-xl text-sm font-medium"
                      >
                        {cat.icon} {cat.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Location */}
                {providerProfile?.locations && providerProfile.locations.length > 0 && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <span className="text-cyan-500">{Icons.location}</span>
                    Působí v: {providerProfile.locations.join(", ")}
                  </p>
                )}
              </div>

              {/* Price & Stats */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-w-[200px]">
                {providerProfile?.hourly_rate && (
                  <div className="text-center mb-4 pb-4 border-b border-gray-100">
                    <span className="text-3xl font-bold text-cyan-600">
                      {providerProfile.hourly_rate} Kč
                    </span>
                    <span className="text-gray-500">/hod</span>
                  </div>
                )}
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="flex items-center justify-between">
                    <span>Zakázek:</span>
                    <span className="font-semibold text-gray-900">{completedJobsCount}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Na Fachmani od:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString("cs-CZ", { month: 'short', year: 'numeric' })}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Stats cards */}
            <div className={`grid grid-cols-3 gap-4 mb-8 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {completedJobsCount}
                </div>
                <p className="text-gray-600 text-sm">Dokončených zakázek</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {reviews.length > 0 ? averageRating : "-"}
                </div>
                <p className="text-gray-600 text-sm">Hodnocení</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {reviews.length}
                </div>
                <p className="text-gray-600 text-sm">Recenzí</p>
              </div>
            </div>

            {/* Reviews */}
            <div className={`bg-white rounded-2xl shadow-sm p-6 ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recenze</h2>

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {Icons.star}
                  </div>
                  <p className="text-gray-500">Zatím žádné recenze</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">{review.profiles?.full_name}</span>
                          <div className="flex items-center gap-1 mt-1">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>
                                {Icons.star}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString("cs-CZ")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 mt-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className={`${mounted ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Potřebujete služby?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Zadejte poptávku a tento fachman vám může poslat nabídku.
              </p>
              <Link
                href="/nova-poptavka"
                className="block w-full text-center bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Zadat poptávku
              </Link>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 text-center">
                  Nebo prohlédněte další fachmany
                </p>
                <Link
                  href="/fachmani"
                  className="block w-full text-center text-cyan-600 font-semibold mt-2 hover:text-cyan-700"
                >
                  Zobrazit všechny fachmany
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}