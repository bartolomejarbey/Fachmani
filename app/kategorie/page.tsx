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
};

export default function Kategorie() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (data) {
        setCategories(data);
      }
      setLoading(false);
    }

    loadCategories();
  }, []);

  const categoryColors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
    "from-amber-500 to-amber-600",
    "from-indigo-500 to-indigo-600",
    "from-rose-500 to-rose-600",
    "from-teal-500 to-teal-600",
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">
              VŠECHNY SLUŽBY
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Kategorie služeb
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Vyberte kategorii a najděte ověřené fachmany ve vašem okolí
            </p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-gray-100 rounded-3xl h-48 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, i) => (
                <Link
                  key={category.id}
                  href={`/kategorie/${category.slug}`}
                  className={`group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[i % categoryColors.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10">
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      {category.icon}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 group-hover:text-white transition-colors mb-3">
                      {category.name}
                    </h2>
                    
                    <p className="text-gray-600 group-hover:text-white/80 transition-colors mb-6">
                      {category.description || "Najděte odborníky v této kategorii"}
                    </p>
                    
                    <div className="flex items-center text-blue-600 group-hover:text-white font-semibold transition-colors">
                      Zobrazit poptávky
                      <span className="ml-2 group-hover:translate-x-2 transition-transform">
                        {Icons.arrowRight}
                      </span>
                    </div>
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