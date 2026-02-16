"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  expires_at: string;
  categories: { id: string; name: string; icon: string } | null;
};

export default function PublicPoptavky() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtry
  const [selectedCategory, setSelectedCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    async function loadData() {
      // Expirujeme staré poptávky
      await supabase.rpc('expire_old_requests');

      // Načteme kategorie
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Načteme aktivní poptávky
      const { data: requestsData } = await supabase
        .from("requests")
        .select("id, title, description, location, budget_min, budget_max, created_at, expires_at, categories(id, name, icon)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (requestsData) {
        setRequests(requestsData as any);
        setFilteredRequests(requestsData as any);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  // Filtrování
  useEffect(() => {
    let result = [...requests];

    if (selectedCategory) {
      result = result.filter(r => r.categories?.id === selectedCategory);
    }

    if (locationFilter) {
      result = result.filter(r => 
        r.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredRequests(result);
  }, [requests, selectedCategory, locationFilter]);

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Aktuální poptávky</h1>
          <p className="text-xl text-blue-100">
            Prohlédněte si {requests.length} aktivních poptávek od zákazníků z celé ČR
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* CTA pro fachmany */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-green-800">Jste fachman?</h2>
              <p className="text-green-700 mt-1">
                Zaregistrujte se a začněte reagovat na poptávky. První 3 nabídky měsíčně zdarma!
              </p>
            </div>
            <Link
              href="/auth/register?role=provider"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 whitespace-nowrap"
            >
              Registrovat se
            </Link>
          </div>
        </div>

        {/* Filtry */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategorie
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Všechny kategorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokalita
              </label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Např. Praha, Brno..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setLocationFilter("");
                }}
                className="w-full px-3 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Zrušit filtry
              </button>
            </div>
          </div>
        </div>

        {/* Počet výsledků */}
        <p className="text-gray-500 mb-4">
          {filteredRequests.length} {filteredRequests.length === 1 ? "poptávka" : filteredRequests.length < 5 ? "poptávky" : "poptávek"}
        </p>

        {/* Seznam poptávek */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Načítám poptávky...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {requests.length === 0 
                ? "Momentálně nejsou žádné aktivní poptávky." 
                : "Žádné poptávky neodpovídají vašim filtrům."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-blue-600 font-medium">
                        {request.categories?.icon} {request.categories?.name}
                      </span>
                      {daysLeft(request.expires_at) <= 3 && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                          Končí brzy!
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold">{request.title}</h2>
                    <p className="text-gray-600 mt-2 line-clamp-2">{request.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-500">
                      Zbývá {daysLeft(request.expires_at)} dní
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                  <span>📍 {request.location}</span>
                  {(request.budget_min || request.budget_max) && (
                    <span>
                      💰 {request.budget_min && `${request.budget_min.toLocaleString()} Kč`}
                      {request.budget_min && request.budget_max && " - "}
                      {request.budget_max && `${request.budget_max.toLocaleString()} Kč`}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                  <Link
                    href={`/poptavka/${request.id}`}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Zobrazit detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA dole */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Potřebujete službu?</h2>
          <p className="text-gray-600 mb-6">
            Zadejte poptávku a nechte fachmany, ať se ozvou vám.
          </p>
          <Link
            href="/nova-poptavka"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Zadat poptávku
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}