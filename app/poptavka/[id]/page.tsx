"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

export default function PoptavkaDetail() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Formulář pro nabídku
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user.id);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_verified")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setUserRole(profile.role);
          setIsVerified(profile.is_verified);
        }
      }

      // Načteme poptávku
      const { data: requestData } = await supabase
        .from("requests")
        .select("*, categories(name, icon), profiles(full_name)")
        .eq("id", params.id)
        .single();

      if (requestData) {
        setRequest(requestData as Request);
      }

      // Načteme nabídky
      const { data: offersData } = await supabase
        .from("offers")
        .select("*, profiles(full_name, is_verified)")
        .eq("request_id", params.id)
        .order("created_at", { ascending: false });

      if (offersData) {
        setOffers(offersData as Offer[]);
      }

      setLoading(false);
    }

    loadData();
  }, [params.id]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("offers").insert({
      request_id: params.id,
      provider_id: currentUser,
      price: parseInt(offerPrice),
      description: offerDescription,
      available_date: offerDate || null,
    });

    if (!error) {
      // Reload offers
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
    }

    setSubmitting(false);
  };

  const handleAcceptOffer = async (offerId: string) => {
    // Přijmeme nabídku
    await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId);

    // Uzavřeme poptávku
    await supabase
      .from("requests")
      .update({ status: "closed_selected" })
      .eq("id", params.id);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Poptávka nenalezena.</p>
      </div>
    );
  }

  const isOwner = currentUser === request.user_id;
  const canOffer = userRole === "provider" && isVerified && !isOwner && request.status === "active";
  const alreadyOffered = offers.some((o) => o.provider_id === currentUser);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <Link
            href={userRole === "provider" ? "/dashboard/fachman" : "/dashboard"}
            className="text-gray-600 hover:text-gray-900"
          >
            Zpět na dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Detail poptávky */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-sm text-blue-600 font-medium">
                {request.categories?.icon} {request.categories?.name}
              </span>
              <h1 className="text-2xl font-bold mt-1">{request.title}</h1>
            </div>
            <div className="text-right">
              {request.status === "active" ? (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  Aktivní - zbývá {daysLeft(request.expires_at)} dní
                </span>
              ) : (
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                  {request.status === "closed_selected" ? "Ukončeno - vybrán fachman" : "Ukončeno"}
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-700 whitespace-pre-wrap mb-6">{request.description}</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="mr-2">📍</span>
              {request.location} {request.postal_code && `(${request.postal_code})`}
            </div>
            {(request.budget_min || request.budget_max) && (
              <div className="flex items-center text-gray-600">
                <span className="mr-2">💰</span>
                {request.budget_min && `${request.budget_min} Kč`}
                {request.budget_min && request.budget_max && " - "}
                {request.budget_max && `${request.budget_max} Kč`}
              </div>
            )}
            {request.preferred_date && (
              <div className="flex items-center text-gray-600">
                <span className="mr-2">📅</span>
                {new Date(request.preferred_date).toLocaleDateString("cs-CZ")}
              </div>
            )}
            <div className="flex items-center text-gray-600">
              <span className="mr-2">👤</span>
              {request.profiles?.full_name}
            </div>
          </div>
        </div>

        {/* Tlačítko pro nabídku */}
        {canOffer && !alreadyOffered && !showOfferForm && (
          <button
            onClick={() => setShowOfferForm(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-8"
          >
            Poslat nabídku
          </button>
        )}

        {alreadyOffered && userRole === "provider" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-800">✓ Již jste odeslali nabídku na tuto poptávku.</p>
          </div>
        )}

        {userRole === "provider" && !isVerified && !isOwner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <p className="text-yellow-800">
              Pro odesílání nabídek musíte mít ověřený účet.{" "}
              <Link href="/overeni" className="underline">
                Ověřit účet
              </Link>
            </p>
          </div>
        )}

        {/* Formulář nabídky */}
        {showOfferForm && (
          <form onSubmit={handleSubmitOffer} className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Vaše nabídka</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cena (Kč) *
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Popis nabídky *
                </label>
                <textarea
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  required
                  rows={3}
                  placeholder="Popište jak byste zakázku řešili..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dostupný termín
                </label>
                <input
                  type="date"
                  value={offerDate}
                  onChange={(e) => setOfferDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Odesílám..." : "Odeslat nabídku"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfferForm(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Zrušit
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Seznam nabídek */}
        {(isOwner || userRole === "provider") && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Nabídky ({offers.length})
            </h2>

            {offers.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                Zatím žádné nabídky.
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{offer.profiles?.full_name}</span>
                          {offer.profiles?.is_verified && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              ✓ Ověřeno
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-2">{offer.description}</p>
                        {offer.available_date && (
                          <p className="text-sm text-gray-500 mt-2">
                            📅 Dostupný: {new Date(offer.available_date).toLocaleDateString("cs-CZ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600">
                          {offer.price.toLocaleString()} Kč
                        </span>
                        {offer.status === "accepted" && (
                          <span className="block text-green-600 text-sm mt-1">✓ Přijato</span>
                        )}
                      </div>
                    </div>

<div className="mt-4 pt-4 border-t flex gap-2">
  <Link
    href={`/zpravy/${request.id}/${offer.provider_id}`}
    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
  >
    Napsat zprávu
  </Link>
  {isOwner && request.status === "active" && offer.status === "pending" && (
    <button
      onClick={() => handleAcceptOffer(offer.id)}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
    >
      Přijmout nabídku
    </button>
  )}
</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}