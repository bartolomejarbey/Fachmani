"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import ReviewForm from "@/app/components/ReviewForm";

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  postal_code: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_date: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  user_id: string;
  categories: { name: string; icon: string } | null;
  profiles: { full_name: string } | null;
};

type Offer = {
  id: string;
  price: number;
  description: string;
  available_date: string | null;
  status: string;
  created_at: string;
  provider_id: string;
  profiles: { full_name: string; is_verified: boolean } | null;
};

type UserProfile = {
  role: string;
  is_verified: boolean;
  subscription_type: string;
  monthly_offers_count: number;
  full_name: string;
};

export default function PoptavkaDetail() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [existingReview, setExistingReview] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Formulář pro nabídku
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user.id);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_verified, subscription_type, monthly_offers_count, full_name")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setUserProfile(profile);
        }

        const { data: reviewData } = await supabase
          .from("reviews")
          .select("id")
          .eq("request_id", params.id)
          .eq("customer_id", user.id)
          .single();

        if (reviewData) {
          setExistingReview(true);
        }
      }

      const { data: requestData } = await supabase
        .from("requests")
        .select("*, categories(name, icon), profiles(full_name)")
        .eq("id", params.id)
        .single();

      if (requestData) {
        setRequest(requestData as Request);
      }

      if (user) {
        const { data: offersData } = await supabase
          .from("offers")
          .select("*, profiles(full_name, is_verified)")
          .eq("request_id", params.id)
          .order("created_at", { ascending: false });

        if (offersData) {
          setOffers(offersData as Offer[]);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [params.id]);

  const canSendOffer = () => {
    if (!userProfile) return false;
    if (userProfile.subscription_type === "free") {
      return userProfile.monthly_offers_count < 3;
    }
    return true;
  };

  const getRemainingOffers = () => {
    if (!userProfile) return 0;
    if (userProfile.subscription_type !== "free") return "∞";
    return 3 - userProfile.monthly_offers_count;
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!canSendOffer()) {
      setError("Dosáhli jste měsíčního limitu nabídek. Upgradujte na Premium pro neomezené nabídky.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("offers").insert({
      request_id: params.id,
      provider_id: currentUser,
      price: parseInt(offerPrice),
      description: offerDescription,
      available_date: offerDate || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    if (userProfile?.subscription_type === "free") {
      await supabase
        .from("profiles")
        .update({ monthly_offers_count: (userProfile.monthly_offers_count || 0) + 1 })
        .eq("id", currentUser);
    }

    await supabase.from("notifications").insert({
      user_id: request?.user_id,
      type: "new_offer",
      title: "Nová nabídka",
      message: `Na vaši poptávku "${request?.title}" přišla nová nabídka za ${parseInt(offerPrice).toLocaleString()} Kč.`,
      link: `/poptavka/${params.id}`,
    });

    const { data: offersData } = await supabase
      .from("offers")
      .select("*, profiles(full_name, is_verified)")
      .eq("request_id", params.id)
      .order("created_at", { ascending: false });

    if (offersData) {
      setOffers(offersData as Offer[]);
    }

    setShowOfferForm(false);
    setOfferPrice("");
    setOfferDescription("");
    setOfferDate("");
    setSubmitting(false);
  };

  const handleAcceptOffer = async (offerId: string, providerId: string) => {
    await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId);

    await supabase
      .from("requests")
      .update({ status: "closed_selected" })
      .eq("id", params.id);

    await supabase.from("notifications").insert({
      user_id: providerId,
      type: "offer_accepted",
      title: "Nabídka přijata! 🎉",
      message: `Vaše nabídka na "${request?.title}" byla přijata.`,
      link: `/poptavka/${params.id}`,
    });

    router.refresh();
    window.location.reload();
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icons.search}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Poptávka nenalezena</h2>
            <p className="text-gray-600 mb-6">Tato poptávka neexistuje nebo byla smazána.</p>
            <Link href="/poptavky" className="inline-flex items-center gap-2 text-cyan-600 font-semibold hover:text-cyan-700">
              {Icons.arrowRight} Zpět na poptávky
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = currentUser === request.user_id;
  const isProvider = userProfile?.role === "provider";
  const isVerified = userProfile?.is_verified || false;
  const canOffer = isProvider && isVerified && !isOwner && request.status === "active";
  const alreadyOffered = offers.some((o) => o.provider_id === currentUser);
  const acceptedOffer = offers.find((o) => o.status === "accepted");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero header */}
      <section className="pt-24 pb-8 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4">
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/poptavky" className="hover:text-cyan-600 transition-colors">Poptávky</Link>
              <span>/</span>
              <span className="text-gray-900">{request.title}</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{request.categories?.icon}</span>
                  <span className="text-cyan-600 font-semibold">{request.categories?.name}</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {request.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="text-cyan-500">{Icons.location}</span>
                    {request.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">{Icons.users}</span>
                    {request.profiles?.full_name}
                  </span>
                  <span className="text-gray-400">
                    {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {request.status === "active" ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                    <span className="text-sm text-emerald-600 font-semibold">Zbývá</span>
                    <p className={`text-4xl font-bold ${daysLeft(request.expires_at) <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {daysLeft(request.expires_at)} dní
                    </p>
                    <div className="w-full h-2 bg-emerald-200 rounded-full mt-3">
                      <div 
                        className="h-2 bg-emerald-500 rounded-full transition-all" 
                        style={{ width: `${(daysLeft(request.expires_at) / 14) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-2xl p-6 text-center">
                    <span className="text-gray-600 font-semibold">
                      {request.status === "closed_selected" ? "✓ Fachman vybrán" : "Ukončeno"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className={`bg-white rounded-2xl shadow-sm p-6 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Popis poptávky</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {request.description}
              </p>
            </div>

            {/* CTA for non-logged users */}
            {!isLoggedIn && request.status === "active" && (
              <div className={`relative rounded-2xl overflow-hidden ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500"></div>
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="relative z-10 p-8 text-white">
                  <h2 className="text-2xl font-bold mb-2">Jste fachman? Reagujte na tuto poptávku!</h2>
                  <p className="text-white/80 mb-6">
                    Zaregistrujte se a pošlete svou nabídku. První 3 nabídky měsíčně jsou zdarma.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/auth/register?role=provider"
                      className="inline-flex items-center gap-2 bg-white text-cyan-600 px-6 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
                    >
                      Registrovat se jako fachman {Icons.arrowRight}
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 border-2 border-white/50 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all"
                    >
                      Již mám účet
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Review form */}
            {isOwner && acceptedOffer && !existingReview && (
              <div className={`${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                <ReviewForm
                  requestId={request.id}
                  providerId={acceptedOffer.provider_id}
                  customerId={currentUser!}
                  onReviewSubmitted={() => setExistingReview(true)}
                />
              </div>
            )}

            {isOwner && existingReview && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                <p className="text-emerald-800 font-semibold flex items-center gap-2">
                  {Icons.check} Děkujeme za vaše hodnocení!
                </p>
              </div>
            )}

            {/* Offer form */}
            {showOfferForm && (
              <div className={`bg-white rounded-2xl shadow-sm p-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Vaše nabídka</h2>
                
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmitOffer} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cena (Kč) *
                    </label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      placeholder="Zadejte cenu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Popis nabídky *
                    </label>
                    <textarea
                      value={offerDescription}
                      onChange={(e) => setOfferDescription(e.target.value)}
                      required
                      rows={4}
                      placeholder="Popište jak byste zakázku řešili, vaše zkušenosti..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dostupný termín
                    </label>
                    <input
                      type="date"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Odesílám...
                        </>
                      ) : (
                        <>Odeslat nabídku {Icons.arrowRight}</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      className="px-6 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all"
                    >
                      Zrušit
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Offers list */}
            {isLoggedIn && (isOwner || isProvider) && (
              <div className={`${mounted ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Nabídky ({offers.length})
                </h2>

                {offers.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {Icons.briefcase}
                    </div>
                    <p className="text-gray-600">Zatím žádné nabídky.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offers.map((offer, i) => (
                      <div 
                        key={offer.id} 
                        className={`bg-white rounded-2xl shadow-sm p-6 border-2 transition-all ${
                          offer.status === "accepted" 
                            ? "border-emerald-300 bg-emerald-50" 
                            : "border-transparent hover:shadow-lg"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                              {offer.profiles?.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">{offer.profiles?.full_name}</span>
                                {offer.profiles?.is_verified && (
                                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                    {Icons.check} Ověřeno
                                  </span>
                                )}
                                {offer.status === "accepted" && (
                                  <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    Vybráno
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mt-2">{offer.description}</p>
                              {offer.available_date && (
                                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                  <span>{Icons.lightning}</span>
                                  Dostupný: {new Date(offer.available_date).toLocaleDateString("cs-CZ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-cyan-600">
                              {offer.price.toLocaleString()} Kč
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                          <Link
                            href={`/fachman/${offer.provider_id}`}
                            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                          >
                            {Icons.users} Zobrazit profil
                          </Link>
                          <Link
                            href={`/zpravy/${request.id}/${offer.provider_id}`}
                            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                          >
                            {Icons.chat} Napsat zprávu
                          </Link>
                          {isOwner && request.status === "active" && offer.status === "pending" && (
                            <button
                              onClick={() => handleAcceptOffer(offer.id, offer.provider_id)}
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                              {Icons.check} Přijmout nabídku
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Login prompt */}
            {!isLoggedIn && (
              <div className="bg-gray-100 rounded-2xl p-8 text-center">
                <p className="text-gray-600 mb-4">
                  Pro zobrazení nabídek a reakci na poptávku se přihlaste.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-cyan-600 font-semibold hover:text-cyan-700"
                >
                  Přihlásit se {Icons.arrowRight}
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details card */}
            <div className={`bg-white rounded-2xl shadow-sm p-6 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
              <h3 className="font-bold text-gray-900 mb-4">Detaily poptávky</h3>
              <div className="space-y-4">
                {(request.budget_min || request.budget_max) && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                      {Icons.briefcase}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Rozpočet</p>
                      <p className="font-semibold text-gray-900">
                        {request.budget_min && `${request.budget_min.toLocaleString()} Kč`}
                        {request.budget_min && request.budget_max && " - "}
                        {request.budget_max && `${request.budget_max.toLocaleString()} Kč`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 flex-shrink-0">
                    {Icons.location}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lokalita</p>
                    <p className="font-semibold text-gray-900">
                      {request.location} {request.postal_code && `(${request.postal_code})`}
                    </p>
                  </div>
                </div>
                {request.preferred_date && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                      {Icons.lightning}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preferovaný termín</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(request.preferred_date).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider alerts/actions */}
            {isProvider && !isOwner && (
              <>
                {userProfile?.subscription_type === "free" && (
                  <div className={`bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-4 ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                    <p className="text-cyan-800 font-semibold mb-1">
                      Zbývající nabídky: {getRemainingOffers()}/3
                    </p>
                    <Link
                      href="/dashboard/fachman/predplatne"
                      className="text-cyan-600 text-sm hover:underline"
                    >
                      Upgradovat na Premium →
                    </Link>
                  </div>
                )}

                {!isVerified && (
                  <div className={`bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                    <p className="text-amber-800 font-semibold mb-2">
                      Účet není ověřen
                    </p>
                    <p className="text-amber-700 text-sm mb-3">
                      Pro odesílání nabídek musíte mít ověřený účet.
                    </p>
                    <Link 
                      href="/overeni" 
                      className="inline-flex items-center gap-1 text-amber-800 font-semibold text-sm hover:underline"
                    >
                      Ověřit účet {Icons.arrowRight}
                    </Link>
                  </div>
                )}

                {alreadyOffered && (
                  <div className={`bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                    <p className="text-emerald-800 font-semibold flex items-center gap-2">
                      {Icons.check} Nabídka odeslána
                    </p>
                    <p className="text-emerald-700 text-sm mt-1">
                      Již jste odeslali nabídku na tuto poptávku.
                    </p>
                  </div>
                )}

                {canOffer && !alreadyOffered && !showOfferForm && (
                  <div className={`${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                    {canSendOffer() ? (
                      <button
                        onClick={() => setShowOfferForm(true)}
                        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all"
                      >
                        Poslat nabídku
                      </button>
                    ) : (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                        <p className="text-orange-800 font-semibold mb-2">
                          Limit nabídek vyčerpán
                        </p>
                        <Link
                          href="/dashboard/fachman/predplatne"
                          className="inline-block bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-all"
                        >
                          Upgradovat na Premium
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}