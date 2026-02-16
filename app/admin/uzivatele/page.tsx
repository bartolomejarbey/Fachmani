"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  subscription_type: string;
  created_at: string;
};

export default function AdminUzivatele() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // Filtry
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      // Načteme uživatele
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersData) {
        setUsers(usersData);
        setFilteredUsers(usersData);
      }

      setLoading(false);
    }

    checkAdminAndLoad();
  }, [router]);

  // Filtrování
  useEffect(() => {
    let result = [...users];

    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter);
    }

    if (verifiedFilter === "verified") {
      result = result.filter(u => u.is_verified);
    } else if (verifiedFilter === "unverified") {
      result = result.filter(u => !u.is_verified);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(result);
  }, [users, roleFilter, verifiedFilter, searchQuery]);

  const handleVerify = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", userId);

    setUsers(users.map(u => 
      u.id === userId ? { ...u, is_verified: true } : u
    ));
  };

  const handleUnverify = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ is_verified: false })
      .eq("id", userId);

    setUsers(users.map(u => 
      u.id === userId ? { ...u, is_verified: false } : u
    ));
  };

  const handleSetPremium = async (userId: string, plan: string) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase
      .from("profiles")
      .update({ 
        subscription_type: plan,
        subscription_expires_at: plan === "free" ? null : expiresAt.toISOString()
      })
      .eq("id", userId);

    setUsers(users.map(u => 
      u.id === userId ? { ...u, subscription_type: plan } : u
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigace */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="text-xl font-bold">
              Fachmani Admin
            </Link>
            <div className="flex space-x-4">
              <Link href="/admin" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/uzivatele" className="text-white font-medium">
                Uživatelé
              </Link>
              <Link href="/admin/poptavky" className="text-gray-300 hover:text-white">
                Poptávky
              </Link>
              <Link href="/admin/kategorie" className="text-gray-300 hover:text-white">
                Kategorie
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Uživatelé</h1>
          <span className="text-gray-500">{filteredUsers.length} uživatelů</span>
        </div>

        {/* Filtry */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hledat
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jméno nebo email..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Všechny role</option>
                <option value="customer">Zákazníci</option>
                <option value="provider">Fachmani</option>
                <option value="admin">Admini</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ověření
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Všichni</option>
                <option value="verified">Ověření</option>
                <option value="unverified">Neověření</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setRoleFilter("");
                  setVerifiedFilter("");
                  setSearchQuery("");
                }}
                className="w-full px-3 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Zrušit filtry
              </button>
            </div>
          </div>
        </div>

        {/* Tabulka uživatelů */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Uživatel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Předplatné
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registrace
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{user.full_name || "-"}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === "admin" 
                        ? "bg-purple-100 text-purple-800"
                        : user.role === "provider"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.role === "admin" ? "Admin" : user.role === "provider" ? "Fachman" : "Zákazník"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_verified ? (
                      <span className="text-green-600 text-sm">✓ Ověřeno</span>
                    ) : (
                      <span className="text-yellow-600 text-sm">Neověřeno</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.subscription_type === "premium"
                        ? "bg-blue-100 text-blue-800"
                        : user.subscription_type === "business"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.subscription_type === "premium" 
                        ? "Premium" 
                        : user.subscription_type === "business"
                        ? "Business"
                        : "Free"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {user.role === "provider" && (
                        <>
                          {user.is_verified ? (
                            <button
                              onClick={() => handleUnverify(user.id)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm"
                            >
                              Zrušit ověření
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerify(user.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Ověřit
                            </button>
                          )}
                          <span className="text-gray-300">|</span>
                          <select
                            value={user.subscription_type || "free"}
                            onChange={(e) => handleSetPremium(user.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="business">Business</option>
                          </select>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Žádní uživatelé nenalezeni.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}