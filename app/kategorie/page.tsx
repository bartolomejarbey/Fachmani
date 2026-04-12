"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  providerCount: number;
  requestCount: number;
};

export default function Kategorie() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);

    async function loadCategories() {
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (!cats) {
        setLoading(false);
        return;
      }

      // Count providers per category
      const { data: providerCats } = await supabase
        .from("provider_categories")
        .select("category_id");

      const providerCounts: Record<string, number> = {};
      providerCats?.forEach((pc) => {
        providerCounts[pc.category_id] = (providerCounts[pc.category_id] || 0) + 1;
      });

      // Count active requests per category
      const { data: requests } = await supabase
        .from("requests")
        .select("category_id")
        .eq("status", "active");

      const requestCounts: Record<string, number> = {};
      requests?.forEach((r) => {
        if (r.category_id) {
          requestCounts[r.category_id] = (requestCounts[r.category_id] || 0) + 1;
        }
      });

      setCategories(
        cats.map((c) => ({
          ...c,
          providerCount: providerCounts[c.id] || 0,
          requestCount: requestCounts[c.id] || 0,
        }))
      );
      setLoading(false);
    }

    loadCategories();
  }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full opacity-30 animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-200/30 rounded-full opacity-30 animate-float animation-delay-200"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              VŠECHNY SLUŽBY
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Kategorie služeb
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Vyberte kategorii a najděte ověřené fachmany ve vašem okolí
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hledat kategorii..."
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-2xl h-40 animate-pulse"></div>
                ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                {search ? "Žádná kategorie neodpovídá hledání." : "Žádné kategorie."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((cat, i) => (
                <Link
                  key={cat.id}
                  href={`/fachmani?kategorie=${cat.id}`}
                  className={`bg-white rounded-2xl p-4 border border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all group ${
                    mounted ? "animate-fade-in-up" : "opacity-0"
                  }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <h2 className="font-bold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors">
                    {cat.name}
                  </h2>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <span className="text-cyan-500">{Icons.users}</span>
                      {cat.providerCount} fachmanů
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <span className="text-emerald-500">{Icons.briefcase}</span>
                      {cat.requestCount} aktivních poptávek
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-bg"></div>
            <div className="absolute inset-0 bg-black/10"></div>

            <div className="relative z-10 px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Nenašli jste co hledáte?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Zadejte poptávku a fachmani se vám ozvou sami. Je to rychlé a zdarma.
              </p>
              <Link
                href="/nova-poptavka"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
              >
                Zadat poptávku
                {Icons.arrowRight}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
