"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Stats = {
  totalUsers: number;
  totalProviders: number;
  totalCustomers: number;
  verifiedProviders: number;
  totalRequests: number;
  activeRequests: number;
  totalOffers: number;
  totalReviews: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProviders: 0,
    totalCustomers: 0,
    verifiedProviders: 0,
    totalRequests: 0,
    activeRequests: 0,
    totalOffers: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    async function checkAdminAndLoadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Zkontrolujeme, jestli je admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Načteme statistiky
      const [
        { count: totalUsers },
        { count: totalProviders },
        { count: totalCustomers },
        { count: verifiedProviders },
        { count: totalRequests },
        { count: activeRequests },
        { count: totalOffers },
        { count: totalReviews },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "provider"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "provider").eq("is_verified", true),
        supabase.from("requests").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("offers").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalProviders: totalProviders || 0,
        totalCustomers: totalCustomers || 0,
        verifiedProviders: verifiedProviders || 0,
        totalRequests: totalRequests || 0,
        activeRequests: activeRequests || 0,
        totalOffers: totalOffers || 0,
        totalReviews: totalReviews || 0,
      });

      setLoading(false);
    }

    checkAdminAndLoadStats();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
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
              <Link href="/admin/uzivatele" className="text-gray-300 hover:text-white">
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
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-300 hover:text-white text-sm">
              Zpět na web
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white text-sm"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Statistiky */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm mb-1">Celkem uživatelů</p>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
            <p className="text-sm text-gray-400 mt-2">
              {stats.totalCustomers} zákazníků, {stats.totalProviders} fachmanů
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm mb-1">Ověření fachmani</p>
            <p className="text-3xl font-bold text-green-600">{stats.verifiedProviders}</p>
            <p className="text-sm text-gray-400 mt-2">
              z {stats.totalProviders} registrovaných
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm mb-1">Poptávky</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalRequests}</p>
            <p className="text-sm text-gray-400 mt-2">
              {stats.activeRequests} aktivních
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm mb-1">Nabídky</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalOffers}</p>
            <p className="text-sm text-gray-400 mt-2">
              {stats.totalReviews} recenzí
            </p>
          </div>
        </div>

        {/* Rychlé akce */}
        <h2 className="text-xl font-semibold mb-4">Rychlé akce</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/admin/uzivatele?filter=unverified"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h3 className="font-semibold">Ověřit fachmany</h3>
                <p className="text-sm text-gray-500">
                  {stats.totalProviders - stats.verifiedProviders} čeká na ověření
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/poptavky"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="font-semibold">Spravovat poptávky</h3>
                <p className="text-sm text-gray-500">
                  {stats.activeRequests} aktivních poptávek
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/kategorie"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
              <div>
                <h3 className="font-semibold">Spravovat kategorie</h3>
                <p className="text-sm text-gray-500">
                  Přidat nebo upravit kategorie
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}