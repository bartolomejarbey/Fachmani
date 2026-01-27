"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
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
  categories: any;
  profiles: any;
};

export default function FachmanDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Načteme profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        
        // Pokud není fachman, přesměrujeme
        if (profileData.role !== "provider") {
          router.push("/dashboard");
          return;
        }
      }

      // Načteme aktivní poptávky
      const { data: requestsData } = await supabase
        .from("requests")
        .select("id, title, description, location, budget_min, budget_max, status, created_at, expires_at, categories(name), profiles(full_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (requestsData) {
        setRequests(requestsData as Request[]);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <div className="flex items-center space-x-4">
  <span className="text-gray-600">Ahoj, {profile?.full_name}</span>
  {!profile?.is_verified && (
    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
      Neověřeno
    </span>
  )}
  <Link href="/zpravy" className="text-gray-600 hover:text-gray-900">
    Zprávy
  </Link>
  <Link href="/dashboard/fachman/profil" className="text-gray-600 hover:text-gray-900">
    Můj profil
  </Link>
  <button
    onClick={handleLogout}
    className="text-gray-600 hover:text-gray-900"
  >
    Odhlásit se
  </button>
</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Upozornění na ověření */}
        {!profile?.is_verified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-yellow-800">Váš účet není ověřen</h3>
            <p className="text-yellow-700 mt-1">
              Pro odesílání nabídek musíte ověřit svou identitu přes BankID.
            </p>
            <Link
              href="/overeni"
              className="inline-block mt-2 text-yellow-800 font-medium hover:underline"
            >
              Ověřit účet →
            </Link>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-8">Dostupné poptávky</h1>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Momentálně nejsou žádné aktivní poptávky.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-blue-600 font-medium">
                      {request.categories?.name}
                    </span>
                    <h2 className="text-xl font-semibold mt-1">{request.title}</h2>
                    <p className="text-gray-600 mt-2 line-clamp-2">{request.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      Zbývá {daysLeft(request.expires_at)} dní
                    </span>
                  </div>
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
    </div>
  );
}