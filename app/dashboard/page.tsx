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
};

type Request = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  categories: { name: string } | null;
};

export default function Dashboard() {
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
        
        // Pokud je to fachman, přesměrujeme
        if (profileData.role === "provider") {
          router.push("/dashboard/fachman");
          return;
        }
      }

      // Načteme poptávky uživatele
      const { data: requestsData } = await supabase
        .from("requests")
        .select("id, title, status, created_at, categories(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestsData) {
        setRequests(requestsData as any);
      }

      setLoading(false);
    }

    loadData();
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
  <Link href="/zpravy" className="text-gray-600 hover:text-gray-900">
    Zprávy
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Moje poptávky</h1>
          <Link
            href="/nova-poptavka"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            + Nová poptávka
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Zatím nemáte žádné poptávky.</p>
            <Link
              href="/nova-poptavka"
              className="text-blue-600 hover:underline"
            >
              Vytvořte svou první poptávku
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                    Název
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                    Kategorie
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                    Stav
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                    Vytvořeno
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">{request.title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {request.categories?.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          request.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {request.status === "active" ? "Aktivní" : request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/poptavka/${request.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}