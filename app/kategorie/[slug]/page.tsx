"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  expires_at: string;
};

export default function KategorieDetail() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // Načteme kategorii
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (catData) {
        setCategory(catData);

        // Načteme poptávky v této kategorii
        const { data: reqData } = await supabase
          .from("requests")
          .select("*")
          .eq("category_id", catData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (reqData) {
          setRequests(reqData);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [slug]);

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

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Kategorie nenalezena</p>
          <Link href="/kategorie" className="text-blue-600 hover:underline">
            Zpět na kategorie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <div className="space-x-4">
            <Link href="/kategorie" className="text-gray-600 hover:text-gray-900">
              Všechny kategorie
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Přihlásit se
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hlavička kategorie */}
        <div className="mb-8">
          <Link href="/kategorie" className="text-blue-600 hover:underline text-sm">
            ← Všechny kategorie
          </Link>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
              <p className="text-gray-600 mt-1">{category.description}</p>
            </div>
          </div>
        </div>

        {/* Seznam poptávek */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Aktivní poptávky ({requests.length})
          </h2>
          <Link
            href="/nova-poptavka"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Zadat poptávku
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              V této kategorii zatím nejsou žádné aktivní poptávky.
            </p>
            <Link
              href="/nova-poptavka"
              className="text-blue-600 hover:underline"
            >
              Buďte první a zadejte poptávku
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{request.title}</h3>
                    <p className="text-gray-600 mt-2 line-clamp-2">
                      {request.description}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    Zbývá {daysLeft(request.expires_at)} dní
                  </span>
                </div>

                <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                  <span>📍 {request.location}</span>
                  {(request.budget_min || request.budget_max) && (
                    <span>
                      💰 {request.budget_min && `${request.budget_min} Kč`}
                      {request.budget_min && request.budget_max && " - "}
                      {request.budget_max && `${request.budget_max} Kč`}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                  <Link
                    href={`/poptavka/${request.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Zobrazit detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 Fachmani. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </div>
  );
}