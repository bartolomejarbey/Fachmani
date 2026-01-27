"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <div className="space-x-4">
            <Link href="/jak-to-funguje" className="text-gray-600 hover:text-gray-900">
              Jak to funguje
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Přihlásit se
            </Link>
            <Link href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Registrace
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Kategorie služeb
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Vyberte kategorii a najděte ověřené fachmany ve vašem okolí
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/kategorie/${category.slug}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
            >
              <div className="text-4xl mb-4">{category.icon}</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {category.name}
              </h2>
              <p className="text-gray-600">
                {category.description || "Najděte odborníky v této kategorii"}
              </p>
              <span className="inline-block mt-4 text-blue-600 font-medium">
                Zobrazit poptávky →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center bg-blue-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Nenašli jste co hledáte?
          </h2>
          <p className="text-gray-600 mb-6">
            Zadejte poptávku a fachmani se vám ozvou sami
          </p>
          <Link
            href="/nova-poptavka"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Zadat poptávku
          </Link>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 Fachmani. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </div>
  );
}