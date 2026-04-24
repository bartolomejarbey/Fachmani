"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import ImageCropper from "@/app/components/ImageCropper";
import IcoInput from "@/app/components/IcoInput";
import VerifiedBadge from "@/app/components/VerifiedBadge";

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  sort_order: number | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_verified: boolean;
  role: string;
  avatar_url: string | null;
  description: string | null;
  location: string | null;
  ico: string | null;
  ares_verified_at: string | null;
  ares_verified_name: string | null;
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
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [ico, setIco] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      setDescription(profileData.description || "");
      setLocation(profileData.location || "");
      setIco(profileData.ico || "");
      setAvatarUrl(profileData.avatar_url || null);

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

      // Načteme pouze aktivní kategorie
      const { data: catsData } = await supabase
        .from("categories")
        .select("id, name, icon, parent_id, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Povolené formáty: JPG, PNG, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Maximální velikost souboru je 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarCropComplete = async (blob: Blob) => {
    if (!profile) return;
    setAvatarCropSrc(null);
    setUploadingAvatar(true);

    const fileName = `${profile.id}/avatar.jpg`;

    // Remove old avatar if exists
    await supabase.storage.from("avatars").remove([`${profile.id}/avatar.jpg`, `${profile.id}/avatar.png`, `${profile.id}/avatar.webp`]);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      alert("Nepodařilo se nahrát fotku.");
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq("id", profile.id);

    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploadingAvatar(false);
    setMessage("Profilová fotka byla nahrána!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    // Input validation
    if (fullName.length > 200) { setMessage("Jméno je příliš dlouhé (max 200 znaků)."); setSaving(false); return; }
    if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone)) { setMessage("Neplatný formát telefonu."); setSaving(false); return; }
    if (description && description.length > 5000) { setMessage("Popis je příliš dlouhý (max 5000 znaků)."); setSaving(false); return; }
    if (ico && !/^\d{8}$/.test(ico)) { setMessage("IČO musí být 8 číslic."); setSaving(false); return; }
    if (location && location.length > 200) { setMessage("Lokalita je příliš dlouhá."); setSaving(false); return; }

    try {
      // Aktualizujeme základní profil
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          description: description || null,
          location: location || null,
          ico: ico || null,
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
                  Pro odesílání nabídek musíte ověřit svou identitu na naší platformě.
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
          
          {/* Avatar section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-3xl">
                  {fullName.charAt(0) || "?"}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <span className="text-white font-semibold text-sm">
                  {uploadingAvatar ? "..." : "📷 Změnit"}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{fullName || "Váš profil"}</h3>
              <p className="text-gray-500 text-sm">{profile?.email}</p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="mt-2 text-cyan-600 text-sm font-semibold hover:text-cyan-700 transition-colors"
              >
                {uploadingAvatar ? "Nahrávám..." : avatarUrl ? "Změnit fotku" : "Nahrát profilovou fotku"}
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Personal info section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {Icons.users} Osobní údaje
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jméno / Název firmy *
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lokalita
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Praha"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <IcoInput
                  value={ico}
                  onChange={setIco}
                  persistToProfile
                  onVerified={(r) => {
                    setProfile((p) =>
                      p
                        ? {
                            ...p,
                            ico: r.ico,
                            ares_verified_name: r.name,
                            ares_verified_at: new Date().toISOString(),
                          }
                        : p
                    );
                  }}
                />
                {profile?.ares_verified_at && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <VerifiedBadge verified source="ares" size="sm" />
                    {profile.ares_verified_name && (
                      <span>
                        Ověřeno jako{" "}
                        <span className="font-medium text-gray-800">
                          {profile.ares_verified_name}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Popis / O mně
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Krátký veřejný popis zobrazený na vašem profilu..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
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

            <div className="space-y-6">
              {categories
                .filter((c) => c.parent_id === null)
                .map((main) => {
                  const subs = categories.filter((c) => c.parent_id === main.id);
                  return (
                    <div key={main.id}>
                      <label
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all mb-2 ${
                          selectedCategories.includes(main.id)
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(main.id)}
                          onChange={() => handleCategoryToggle(main.id)}
                          className="sr-only"
                        />
                        <span className="text-2xl mr-3">{main.icon}</span>
                        <span
                          className={`font-bold ${
                            selectedCategories.includes(main.id) ? "text-cyan-700" : "text-gray-900"
                          }`}
                        >
                          {main.name}
                        </span>
                        {selectedCategories.includes(main.id) && (
                          <span className="ml-auto text-cyan-500">{Icons.check}</span>
                        )}
                      </label>

                      {subs.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                          {subs.map((sub) => (
                            <label
                              key={sub.id}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all text-sm ${
                                selectedCategories.includes(sub.id)
                                  ? "border-cyan-400 bg-cyan-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(sub.id)}
                                onChange={() => handleCategoryToggle(sub.id)}
                                className="sr-only"
                              />
                              <span className="text-base mr-2">{sub.icon}</span>
                              <span
                                className={`${
                                  selectedCategories.includes(sub.id) ? "text-cyan-700" : "text-gray-700"
                                }`}
                              >
                                {sub.name}
                              </span>
                              {selectedCategories.includes(sub.id) && (
                                <span className="ml-auto text-cyan-500">{Icons.check}</span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Avatar Cropper Modal */}
      {avatarCropSrc && (
        <ImageCropper
          imageSrc={avatarCropSrc}
          aspectRatio={1}
          maxWidth={800}
          onCropComplete={handleAvatarCropComplete}
          onCancel={() => setAvatarCropSrc(null)}
        />
      )}
    </div>
  );
}