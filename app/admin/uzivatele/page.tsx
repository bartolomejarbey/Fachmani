"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useSearchParams } from "next/navigation";
import { useAdminActions } from "../hooks/useAdminActions";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  admin_role: string | null;
  is_verified: boolean;
  subscription_type: string;
  created_at: string;
  phone: string | null;
};

type ActivityOffer = {
  id: string;
  price: number;
  created_at: string;
  request_id: string;
  request_title?: string;
  request_status?: string;
};

type ActivityRequest = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  category_name?: string;
};

type ActivityReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  provider_id: string;
  provider_name?: string;
};

type Activity = {
  loaded: boolean;
  // Provider
  recent_offers?: ActivityOffer[];
  offers_total?: number;
  total_promo_spend?: number;
  avg_rating?: number | null;
  review_count?: number;
  // Customer
  recent_requests?: ActivityRequest[];
  requests_total?: number;
  recent_reviews_given?: ActivityReview[];
  reviews_given_total?: number;
  // Common (paid invoices billed to this user_id)
  total_invoice_spend?: number;
};

function UzivateleContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const { handleVerify: sharedHandleVerify, handleChangeAdminRole: sharedHandleAdminRole, logAction } = useAdminActions();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filter]);

  // Lazy-load activity when modal opens — vyhne se zbytečným dotazům na řádkové akce.
  useEffect(() => {
    if (!showModal || !selectedUser) {
      setActivity(null);
      return;
    }
    const userId = selectedUser.id;
    const role = selectedUser.role;
    let cancelled = false;
    setActivityLoading(true);

    (async () => {
      const result: Activity = { loaded: true };
      const queries: PromiseLike<unknown>[] = [];

      if (role === "provider") {
        queries.push(
          supabase
            .from("offers")
            .select(
              "id, price, created_at, request_id, request:request_id(title, status)",
              { count: "exact" }
            )
            .eq("provider_id", userId)
            .order("created_at", { ascending: false })
            .limit(3)
            .then((res) => {
              type OfferRow = Omit<ActivityOffer, "request_title" | "request_status"> & {
                request: { title: string | null; status: string | null } | null;
              };
              result.recent_offers = ((res.data as OfferRow[] | null) ?? []).map((o) => ({
                id: o.id,
                price: o.price,
                created_at: o.created_at,
                request_id: o.request_id,
                request_title: o.request?.title ?? undefined,
                request_status: o.request?.status ?? undefined,
              }));
              result.offers_total = res.count ?? 0;
            })
        );
        queries.push(
          supabase
            .from("promotions")
            .select("price")
            .eq("provider_id", userId)
            .eq("status", "active")
            .then((res) => {
              result.total_promo_spend = (res.data ?? []).reduce(
                (sum: number, p: { price: number | null }) => sum + (p.price || 0),
                0
              );
            })
        );
        queries.push(
          supabase
            .from("profiles")
            .select("avg_rating, review_count")
            .eq("id", userId)
            .single()
            .then((res) => {
              const d = res.data as { avg_rating: number | null; review_count: number | null } | null;
              result.avg_rating = d?.avg_rating ?? null;
              result.review_count = d?.review_count ?? 0;
            })
        );
      } else if (role === "customer") {
        queries.push(
          supabase
            .from("requests")
            .select(
              "id, title, status, created_at, categories:category_id(name)",
              { count: "exact" }
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(3)
            .then((res) => {
              type ReqRow = Omit<ActivityRequest, "category_name"> & {
                categories: { name: string | null } | null;
              };
              result.recent_requests = ((res.data as ReqRow[] | null) ?? []).map((r) => ({
                id: r.id,
                title: r.title,
                status: r.status,
                created_at: r.created_at,
                category_name: r.categories?.name ?? undefined,
              }));
              result.requests_total = res.count ?? 0;
            })
        );
        queries.push(
          supabase
            .from("reviews")
            .select(
              "id, rating, comment, created_at, provider_id, provider:provider_id(full_name)",
              { count: "exact" }
            )
            .eq("customer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3)
            .then((res) => {
              type RevRow = Omit<ActivityReview, "provider_name"> & {
                provider: { full_name: string | null } | null;
              };
              result.recent_reviews_given = ((res.data as RevRow[] | null) ?? []).map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at,
                provider_id: r.provider_id,
                provider_name: r.provider?.full_name ?? undefined,
              }));
              result.reviews_given_total = res.count ?? 0;
            })
        );
      }

      // Společné — celkové výdaje (zaplacené faktury vystavené tomuto user_id).
      queries.push(
        supabase
          .from("invoices")
          .select("total")
          .eq("user_id", userId)
          .eq("status", "paid")
          .then((res) => {
            result.total_invoice_spend = (res.data ?? []).reduce(
              (sum: number, i: { total: number | null }) => sum + (i.total || 0),
              0
            );
          })
      );

      await Promise.all(queries);
      if (!cancelled) {
        setActivity(result);
        setActivityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showModal, selectedUser?.id, selectedUser?.role]);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, admin_role, is_verified, subscription_type, created_at")
      .order("created_at", { ascending: false });

    if (filter === "providers") {
      query = query.eq("role", "provider");
    } else if (filter === "customers") {
      query = query.eq("role", "customer");
    } else if (filter === "unverified") {
      query = query.eq("role", "provider").eq("is_verified", false);
    } else if (filter === "verified") {
      query = query.eq("role", "provider").eq("is_verified", true);
    } else if (filter === "admins") {
      query = query.not("admin_role", "is", null);
    }

    const { data } = await query;
    setUsers((data || []).map((u) => ({ ...u, phone: null })));
    setLoading(false);
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = (userId: string, verify: boolean) => {
    sharedHandleVerify(userId, verify, loadUsers);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      alert("Nepodařilo se změnit roli.");
      return;
    }

    await logAction("change_role", "user", userId, { new_role: newRole });
    loadUsers();
    setShowModal(false);
  };

  const handleChangeAdminRole = (userId: string, adminRole: string | null) => {
    sharedHandleAdminRole(userId, adminRole, () => {
      loadUsers();
      setShowModal(false);
    });
  };

  const handleChangeSubscription = async (userId: string, subscription: string) => {
    await supabase
      .from("profiles")
      .update({ subscription_type: subscription })
      .eq("id", userId);

    loadUsers();
    setShowModal(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "provider":
        return { label: "Fachman", color: "bg-blue-500/20 text-blue-400" };
      case "customer":
        return { label: "Zákazník", color: "bg-emerald-500/20 text-emerald-400" };
      case "admin":
        return { label: "Admin", color: "bg-red-500/20 text-red-400" };
      default:
        return { label: role, color: "bg-gray-500/20 text-gray-400" };
    }
  };

  const getAdminBadge = (adminRole: string | null) => {
    switch (adminRole) {
      case "master_admin":
        return { label: "🔴 Master", color: "bg-red-500/20 text-red-400 border border-red-500/30" };
      case "admin":
        return { label: "🟠 Admin", color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" };
      case "sales":
        return { label: "🟡 Obchodník", color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
      default:
        return null;
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" });

  const formatCZK = (n: number) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);

  const statusLabel = (s: string | undefined) => {
    if (!s) return "—";
    const map: Record<string, string> = {
      active: "aktivní",
      pending: "čeká",
      accepted: "přijatá",
      rejected: "zamítnutá",
      completed: "dokončeno",
      expired: "vypršelo",
      cancelled: "zrušeno",
    };
    return map[s] || s;
  };

  const getSubscriptionBadge = (sub: string) => {
    switch (sub) {
      case "premium":
        return { label: "Premium", color: "bg-purple-500/20 text-purple-400" };
      case "business":
        return { label: "Business", color: "bg-amber-500/20 text-amber-400" };
      default:
        return { label: "Free", color: "bg-slate-500/20 text-slate-400" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Správa uživatelů</h1>
          <p className="text-slate-400">Celkem {users.length} uživatelů</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Hledat podle jména nebo emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Všichni" },
            { key: "providers", label: "Fachmani" },
            { key: "customers", label: "Zákazníci" },
            { key: "unverified", label: "🔴 Neověření" },
            { key: "verified", label: "✅ Ověření" },
            { key: "admins", label: "🛡️ Admini" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === f.key
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Žádní uživatelé nenalezeni
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Uživatel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Stav
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Předplatné
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Registrace
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const adminBadge = getAdminBadge(user.admin_role);
                  const subBadge = getSubscriptionBadge(user.subscription_type);
                  
                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                            {user.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.full_name || "Bez jména"}</p>
                            <p className="text-slate-500 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                          {adminBadge && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${adminBadge.color}`}>
                              {adminBadge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "provider" && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            user.is_verified 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {user.is_verified ? "✅ Ověřen" : "⏳ Neověřen"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${subBadge.color}`}>
                          {subBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === "provider" && !user.is_verified && (
                            <button
                              onClick={() => handleVerify(user.id, true)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                            >
                              ✅ Ověřit
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              setSelectedUser({ ...user, phone: null });
                              setShowModal(true);
                              const { data: ph } = await supabase
                                .rpc("get_provider_phone", { p_provider_id: user.id });
                              setSelectedUser((prev) => prev && prev.id === user.id
                                ? { ...prev, phone: (ph as string | null) ?? null }
                                : prev);
                            }}
                            className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
                          >
                            Upravit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Upravit uživatele</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                  {selectedUser.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-lg truncate">{selectedUser.full_name}</p>
                  <p className="text-slate-400 truncate">{selectedUser.email}</p>
                  <p className="text-slate-500 text-sm">{selectedUser.phone || "Bez telefonu"}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Registrace: {formatDate(selectedUser.created_at)}
                  </p>
                </div>
                {selectedUser.role === "provider" && (
                  <Link
                    href={`/admin/fachmani/${selectedUser.id}`}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                  >
                    Detail →
                  </Link>
                )}
              </div>

              {/* Activity panel — lazy loaded */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">📊 Aktivita</h3>
                  {activityLoading && (
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {!activityLoading && activity && (
                  <div className="space-y-3">
                    {/* Provider stats */}
                    {selectedUser.role === "provider" && (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-800/60 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Nabídek</p>
                            <p className="text-lg font-bold text-white">{activity.offers_total ?? 0}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Recenzí</p>
                            <p className="text-lg font-bold text-white">
                              {activity.review_count ?? 0}
                              {activity.avg_rating != null && activity.review_count ? (
                                <span className="text-xs text-amber-400 ml-1">★{activity.avg_rating.toFixed(1)}</span>
                              ) : null}
                            </p>
                          </div>
                          <div className="bg-slate-800/60 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Promo (akt.)</p>
                            <p className="text-lg font-bold text-white">{formatCZK(activity.total_promo_spend ?? 0)}</p>
                          </div>
                        </div>

                        {activity.recent_offers && activity.recent_offers.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Poslední 3 nabídky</p>
                            <div className="space-y-1.5">
                              {activity.recent_offers.map((o) => (
                                <Link
                                  key={o.id}
                                  href={`/poptavka/${o.request_id}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg text-sm transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white truncate">{o.request_title || "—"}</p>
                                    <p className="text-xs text-slate-500">
                                      {formatDate(o.created_at)} · {statusLabel(o.request_status)}
                                    </p>
                                  </div>
                                  <span className="text-cyan-400 font-medium whitespace-nowrap">
                                    {formatCZK(o.price)}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Žádné nabídky</p>
                        )}
                      </>
                    )}

                    {/* Customer stats */}
                    {selectedUser.role === "customer" && (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-slate-800/60 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Poptávek</p>
                            <p className="text-lg font-bold text-white">{activity.requests_total ?? 0}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Recenzí</p>
                            <p className="text-lg font-bold text-white">{activity.reviews_given_total ?? 0}</p>
                          </div>
                        </div>

                        {activity.recent_requests && activity.recent_requests.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Poslední 3 poptávky</p>
                            <div className="space-y-1.5">
                              {activity.recent_requests.map((r) => (
                                <Link
                                  key={r.id}
                                  href={`/poptavka/${r.id}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg text-sm transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white truncate">{r.title}</p>
                                    <p className="text-xs text-slate-500">
                                      {formatDate(r.created_at)}
                                      {r.category_name ? ` · ${r.category_name}` : ""}
                                    </p>
                                  </div>
                                  <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {statusLabel(r.status)}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Žádné poptávky</p>
                        )}

                        {activity.recent_reviews_given && activity.recent_reviews_given.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Poslední 3 recenze</p>
                            <div className="space-y-1.5">
                              {activity.recent_reviews_given.map((r) => (
                                <Link
                                  key={r.id}
                                  href={`/fachman/${r.provider_id}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg text-sm transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white truncate">
                                      {r.provider_name || "—"}
                                    </p>
                                    {r.comment && (
                                      <p className="text-xs text-slate-500 truncate">{r.comment}</p>
                                    )}
                                  </div>
                                  <span className="text-amber-400 text-xs whitespace-nowrap">
                                    {"★".repeat(Math.round(r.rating))}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Total spend (společné) */}
                    {(activity.total_invoice_spend ?? 0) > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="text-sm text-slate-300">💰 Celkem zaplaceno (faktury)</span>
                        <span className="text-emerald-400 font-bold">
                          {formatCZK(activity.total_invoice_spend ?? 0)}
                        </span>
                      </div>
                    )}

                    {selectedUser.role !== "provider" && selectedUser.role !== "customer" && (
                      <p className="text-xs text-slate-500 italic">
                        Aktivita se zobrazuje pouze pro zákazníky a fachmany.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role uživatele
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["customer", "provider", "admin"].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleChangeRole(selectedUser.id, role)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedUser.role === role
                          ? "bg-cyan-500 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {role === "customer" ? "👤 Zákazník" : role === "provider" ? "👷 Fachman" : "🛡️ Admin"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Role */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin oprávnění
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: null, label: "❌ Žádné" },
                    { key: "sales", label: "🟡 Obchodník" },
                    { key: "admin", label: "🟠 Admin" },
                    { key: "master_admin", label: "🔴 Master Admin" },
                  ].map((opt) => (
                    <button
                      key={opt.key || "none"}
                      onClick={() => handleChangeAdminRole(selectedUser.id, opt.key)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedUser.admin_role === opt.key
                          ? "bg-cyan-500 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription */}
              {selectedUser.role === "provider" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Předplatné
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["free", "premium", "business"].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleChangeSubscription(selectedUser.id, sub)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          selectedUser.subscription_type === sub
                            ? "bg-cyan-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {sub === "free" ? "Free" : sub === "premium" ? "⭐ Premium" : "💎 Business"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification */}
              {selectedUser.role === "provider" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ověření
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { handleVerify(selectedUser.id, true); setSelectedUser({...selectedUser, is_verified: true}); }}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedUser.is_verified
                          ? "bg-emerald-500 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      ✅ Ověřený
                    </button>
                    <button
                      onClick={() => { handleVerify(selectedUser.id, false); setSelectedUser({...selectedUser, is_verified: false}); }}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        !selectedUser.is_verified
                          ? "bg-red-500 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      ❌ Neověřený
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-white/5 text-slate-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUzivatele() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <UzivateleContent />
      </Suspense>
    </AdminLayout>
  );
}