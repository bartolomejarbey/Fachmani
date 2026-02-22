"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useSearchParams } from "next/navigation";

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

function UzivateleContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*")
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
    setUsers(data || []);
    setLoading(false);
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = async (userId: string, verify: boolean) => {
    await supabase
      .from("profiles")
      .update({ is_verified: verify })
      .eq("id", userId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: verify ? "verify_user" : "unverify_user",
      target_type: "user",
      target_id: userId,
    });

    loadUsers();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "change_role",
      target_type: "user",
      target_id: userId,
      details: { new_role: newRole },
    });

    loadUsers();
    setShowModal(false);
  };

  const handleChangeAdminRole = async (userId: string, adminRole: string | null) => {
    await supabase
      .from("profiles")
      .update({ admin_role: adminRole })
      .eq("id", userId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "change_admin_role",
      target_type: "user",
      target_id: userId,
      details: { new_admin_role: adminRole },
    });

    loadUsers();
    setShowModal(false);
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
                            onClick={() => { setSelectedUser(user); setShowModal(true); }}
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
                <div>
                  <p className="text-white font-semibold text-lg">{selectedUser.full_name}</p>
                  <p className="text-slate-400">{selectedUser.email}</p>
                  <p className="text-slate-500 text-sm">{selectedUser.phone || "Bez telefonu"}</p>
                </div>
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