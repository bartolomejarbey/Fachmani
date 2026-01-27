"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_verified: boolean;
};

type ProviderProfile = {
  id: string;
  bio: string | null;
  locations: string[] | null;
  hourly_rate: number | null;
};

export default function FachmanProfil() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Formulářová data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [locations, setLocations] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

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
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");

        if (profileData.role !== "provider") {
          router.push("/dashboard");
          return;
        }
      }

      // Načteme provider profil
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (providerData) {
        setProviderProfile(providerData);
        setBio(providerData.bio || "");
        setLocations(providerData.locations?.join(", ") || "");
        setHourlyRate(providerData.hourly_rate?.toString() || "");

        // Načteme vybrané kategorie
        const { data: providerCats } = await supabase
          .from("provider_categories")
          .select("category_id")
          .eq("provider_id", providerData.id);

        if (providerCats) {
          setSelectedCategories(providerCats.map((pc) => pc.category_id));
        }
      }

      // Načteme všechny kategorie
      const { data: catsData } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (catsData) {
        setCategories(catsData);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      // Aktualizujeme základní profil
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile?.id);

      // Zpracujeme lokality
      const locationsArray = locations
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (providerProfile) {
        // Aktualizujeme provider profil
        await supabase
          .from("provider_profiles")
          .update({
            bio: bio || null,
            locations: locationsArray.length > 0 ? locationsArray : null,
            hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", providerProfile.id);

        // Aktualizujeme kategorie
        await supabase
          .from("provider_categories")
          .delete()
          .eq("provider_id", providerProfile.id);

        if (selectedCategories.length > 0) {
          await supabase.from("provider_categories").insert(
            selectedCategories.map((catId) => ({
              provider_id: providerProfile.id,
              category_id: catId,
            }))
          );
        }
      } else {
        // Vytvoříme nový provider profil
        const { data: newProvider } = await supabase
          .from("provider_profiles")
          .insert({
            user_id: profile?.id,
            bio: bio || null,
            locations: locationsArray.length > 0 ? locationsArray : null,
            hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
          })
          .select()
          .single();

        if (newProvider && selectedCategories.length > 0) {
          await supabase.from("provider_categories").insert(
            selectedCategories.map((catId) => ({
              provider_id: newProvider.id,
              category_id: catId,
            }))
          );
        }
      }

      setMessage("Profil byl úspěšně uložen!");
    } catch (error) {
      setMessage("Chyba při ukládání profilu.");
    }

    setSaving(false);
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <Link href="/dashboard/fachman" className="text-gray-600 hover:text-gray-900">
            Zpět na dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Můj profil</h1>

        {!profile?.is_verified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800">Účet není ověřen</h3>
            <p className="text-yellow-700 mt-1">
              Pro odesílání nabídek musíte ověřit svou identitu.
            </p>
            <Link
              href="/overeni"
              className="inline-block mt-2 text-yellow-800 font-medium hover:underline"
            >
              Ověřit účet →
            </Link>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes("Chyba") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jméno a příjmení *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 xxx xxx xxx"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              O mně / popis služeb
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Popište své zkušenosti, specializaci, co nabízíte..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokality kde působím
            </label>
            <input
              type="text"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="např. Praha, Brno, Ostrava (oddělte čárkou)"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hodinová sazba (Kč)
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="např. 500"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Kategorie služeb
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    selectedCategories.includes(cat.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                    className="mr-2"
                  />
                  <span>{cat.icon} {cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Ukládám..." : "Uložit profil"}
          </button>
        </form>
      </div>
    </div>
  );
}