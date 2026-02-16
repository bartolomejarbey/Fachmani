"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

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
  role: string;
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
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);

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

      if (!profileData) {
        router.push("/auth/login");
        return;
      }

      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");

      if (profileData.role !== "provider") {
        router.push("/dashboard");
        return;
      }

      // Načteme provider profil
      let { data: providerData } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Pokud provider profil neexistuje, vytvoříme ho
      if (!providerData) {
        const { data: newProviderData } = await supabase
          .from("provider_profiles")
          .insert({
            user_id: user.id,
            bio: null,
            locations: null,
            hourly_rate: null,
          })
          .select()
          .single();
        
        providerData = newProviderData;
      }

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
      }

      setMessage("Profil byl úspěšně uložen!");
    } catch (error) {
      setMessage("Chyba při ukládání profilu.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-white border-b">
        <div className="max-w-3xl mx-auto px-4">
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <Link 
              href="/dashboard/fachman" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-cyan-600 mb-4 transition-colors"
            >
              ← Zpět na dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Nastavení profilu</h1>
            <p className="text-gray-600 mt-2">Upravte své údaje a nastavení profilu</p>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Verification alert */}
        {!profile?.is_verified && (
          <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                {Icons.shield}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 text-lg">Ověřte svůj účet</h3>
                <p className="text-amber-700 mt-1">
                  Pro odesílání nabídek musíte ověřit svou identitu přes BankID.
                </p>
                <Link
                  href="/overeni"
                  className="inline-flex items-center gap-2 mt-3 bg-amber-500 text-white px-5 py-2 rounded-xl font-semibold hover:bg-amber-600 transition-all"
                >
                  Ověřit účet {Icons.arrowRight}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error message */}
        {message && (
          <div className={`p-4 rounded-2xl mb-6 flex items-center gap-3 ${
            message.includes("Chyba") 
              ? "bg-red-50 text-red-700 border-2 border-red-200" 
              : "bg-emerald-50 text-emerald-700 border-2 border-emerald-200"
          } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            {message.includes("Chyba") ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              Icons.check
            )}
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
          
          {/* Personal info section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {Icons.users} Osobní údaje
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jméno a příjmení *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 xxx xxx xxx"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Professional info section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {Icons.briefcase} Profesní údaje
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  O mně / popis služeb
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Popište své zkušenosti, specializaci, co nabízíte..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lokality kde působím
                  </label>
                  <input
                    type="text"
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    placeholder="Praha, Brno, Ostrava"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Oddělte čárkou</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hodinová sazba (Kč)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="např. 500"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Categories section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {Icons.star} Kategorie služeb
            </h2>
            <p className="text-gray-600 text-sm mb-4">Vyberte kategorie, ve kterých nabízíte své služby</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedCategories.includes(cat.id)
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                    className="sr-only"
                  />
                  <span className="text-xl mr-2">{cat.icon}</span>
                  <span className={`font-medium ${selectedCategories.includes(cat.id) ? 'text-cyan-700' : 'text-gray-700'}`}>
                    {cat.name}
                  </span>
                  {selectedCategories.includes(cat.id) && (
                    <span className="ml-auto text-cyan-500">{Icons.check}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Ukládám...
                </>
              ) : (
                <>
                  {Icons.check} Uložit profil
                </>
              )}
            </button>
          </div>
        </form>

        {/* Preview link */}
        <div className={`mt-6 text-center ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <Link 
            href={`/fachman/${profile?.id}`}
            className="text-cyan-600 hover:text-cyan-700 font-semibold"
          >
            Zobrazit můj veřejný profil →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}