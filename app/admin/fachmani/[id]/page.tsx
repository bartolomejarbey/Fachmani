"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../../components/AdminLayout";
import CategoryIcon from "@/app/components/CategoryIcon";
import { useAdminActions } from "../../hooks/useAdminActions";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  description: string | null;
  location: string | null;
  ico: string | null;
  is_verified: boolean;
  subscription_type: string | null;
  ares_verified_at: string | null;
  ares_verified_name: string | null;
  bank_verification_status: string | null;
  avg_rating: number | null;
  review_count: number | null;
  created_at: string;
};

type Category = { id: string; name: string; icon: string };

type Offer = {
  id: string;
  price: number;
  description: string | null;
  created_at: string;
  request_id: string;
  request_title?: string;
  request_status?: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name?: string;
};

type Promotion = {
  id: string;
  type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  price: number | null;
};

export default function AdminFachmanDetail() {
  const params = useParams();
  const id = params.id as string;
  const { handleVerify } = useAdminActions();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    const [profRes, catRes, offerRes, reviewRes, promoRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, avatar_url, description, location, ico, is_verified, subscription_type, ares_verified_at, ares_verified_name, bank_verification_status, avg_rating, review_count, created_at"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("provider_categories")
        .select("category:category_id(id, name, icon)")
        .eq("provider_id", id),
      supabase
        .from("offers")
        .select("id, price, description, created_at, request_id, request:request_id(title, status)")
        .eq("provider_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at, customer:customer_id(full_name)")
        .eq("provider_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("promotions")
        .select("id, type, status, starts_at, ends_at, price")
        .eq("provider_id", id)
        .order("starts_at", { ascending: false })
        .limit(20),
    ]);

    if (profRes.data) setProfile(profRes.data as Profile);

    type CatRow = { category: Category | null };
    setCategories(
      ((catRes.data as CatRow[] | null) ?? [])
        .map((r) => r.category)
        .filter((c): c is Category => !!c)
    );

    type OfferRow = Omit<Offer, "request_title" | "request_status"> & {
      request: { title: string | null; status: string | null } | null;
    };
    setOffers(
      ((offerRes.data as OfferRow[] | null) ?? []).map((o) => ({
        id: o.id,
        price: o.price,
        description: o.description,
        created_at: o.created_at,
        request_id: o.request_id,
        request_title: o.request?.title ?? undefined,
        request_status: o.request?.status ?? undefined,
      }))
    );

    type ReviewRow = Omit<Review, "customer_name"> & {
      customer: { full_name: string | null } | null;
    };
    setReviews(
      ((reviewRes.data as ReviewRow[] | null) ?? []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        customer_name: r.customer?.full_name ?? undefined,
      }))
    );

    setPromotions((promoRes.data as Promotion[]) ?? []);
    setLoading(false);
  };

  const onToggleVerify = async () => {
    if (!profile) return;
    await handleVerify(profile.id, !profile.is_verified, load);
    setMessage(profile.is_verified ? "Ověření zrušeno." : "Účet schválen.");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-300">
          Fachman s ID <code>{id}</code> nenalezen.
          <Link href="/admin/fachmani" className="block mt-2 text-cyan-400 hover:text-cyan-300">
            ← Zpět na seznam
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const totalRevenue = offers.reduce((s, o) => s + (o.price || 0), 0);
  const activePromos = promotions.filter((p) => p.status === "active");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Link href="/admin/fachmani" className="text-slate-400 hover:text-white text-sm">
            ← Zpět na seznam
          </Link>
        </div>

        {message && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/40 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shrink-0">
              {profile.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">{profile.full_name || "(bez jména)"}</h1>
                {profile.is_verified && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    ✓ ověřeno
                  </span>
                )}
                {profile.ares_verified_at && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    🏢 ARES
                  </span>
                )}
                {profile.bank_verification_status === "verified" && (
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                    💳 banka
                  </span>
                )}
                {profile.subscription_type && profile.subscription_type !== "free" && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    ⭐ {profile.subscription_type}
                  </span>
                )}
                {activePromos.length > 0 && (
                  <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">
                    🚀 promo aktivní
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">{profile.email}</p>
              {profile.location && (
                <p className="text-slate-500 text-sm mt-1">📍 {profile.location}</p>
              )}
              {profile.ico && (
                <p className="text-slate-500 text-xs mt-1">
                  IČO: <span className="font-mono">{profile.ico}</span>
                  {profile.ares_verified_name && (
                    <> · ARES: {profile.ares_verified_name}</>
                  )}
                </p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                Registrace: {new Date(profile.created_at).toLocaleString("cs-CZ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/fachman/${profile.id}`}
                target="_blank"
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium"
              >
                🌐 Veřejný profil
              </Link>
              <button
                onClick={onToggleVerify}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  profile.is_verified
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {profile.is_verified ? "✗ Zrušit ověření" : "✓ Schválit"}
              </button>
            </div>
          </div>

          {profile.description && (
            <p className="text-slate-300 text-sm mt-4 whitespace-pre-wrap border-t border-white/5 pt-4">
              {profile.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Nabídky", value: offers.length, color: "text-cyan-400" },
            { label: "Recenze", value: reviews.length, color: "text-emerald-400" },
            {
              label: "⌀ hodnocení",
              value: profile.avg_rating ? Number(profile.avg_rating).toFixed(1) : "—",
              color: "text-yellow-400",
            },
            { label: "Promo (vše)", value: promotions.length, color: "text-purple-400" },
            { label: "Σ ceny nabídek", value: `${totalRevenue.toLocaleString()} Kč`, color: "text-pink-400" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-800/50 border border-white/5 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">📁 Kategorie ({categories.length})</h2>
          {categories.length === 0 ? (
            <p className="text-slate-500 text-sm">Fachman nemá vybrané žádné kategorie.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1.5 bg-white/5 text-slate-200 rounded-lg text-sm inline-flex items-center gap-1.5"
                >
                  <CategoryIcon icon={c.icon} size={14} />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Offers */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              💼 Posledních {offers.length} nabídek
            </h2>
            {offers.length === 0 ? (
              <p className="text-slate-500 text-sm">Tento fachman zatím nedal žádnou nabídku.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
                {offers.map((o) => (
                  <div
                    key={o.id}
                    className="bg-slate-900/40 border border-white/5 rounded-xl p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/poptavka/${o.request_id}`}
                        target="_blank"
                        className="text-cyan-300 hover:text-cyan-200 font-medium truncate"
                      >
                        {o.request_title || "(poptávka smazána)"}
                      </Link>
                      <span className="text-cyan-400 font-bold whitespace-nowrap">
                        {o.price.toLocaleString()} Kč
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{new Date(o.created_at).toLocaleDateString("cs-CZ")}</span>
                      {o.request_status && (
                        <span className="px-2 py-0.5 bg-white/5 rounded">{o.request_status}</span>
                      )}
                    </div>
                    {o.description && (
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{o.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              ⭐ Posledních {reviews.length} recenzí
            </h2>
            {reviews.length === 0 ? (
              <p className="text-slate-500 text-sm">Tento fachman ještě nemá recenze.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-900/40 border border-white/5 rounded-xl p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-yellow-400 font-bold">
                        {"★".repeat(r.rating)}
                        <span className="text-slate-700">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(r.created_at).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs mt-1">{r.customer_name || "(neznámý zákazník)"}</p>
                    {r.comment && (
                      <p className="text-slate-400 text-xs mt-1 whitespace-pre-wrap">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Promotions */}
        {promotions.length > 0 && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              🚀 Promo / topování ({promotions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left py-2">Typ</th>
                    <th className="text-left py-2">Stav</th>
                    <th className="text-left py-2">Začátek</th>
                    <th className="text-left py-2">Konec</th>
                    <th className="text-right py-2">Cena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {promotions.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-white">{p.type}</td>
                      <td className="py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            p.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">
                        {new Date(p.starts_at).toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="py-2 text-slate-400">
                        {new Date(p.ends_at).toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="py-2 text-right text-cyan-400 font-medium">
                        {p.price ? `${p.price.toLocaleString()} Kč` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
