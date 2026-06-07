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
import PushOptIn from "@/app/components/PushOptIn";
import LocationSelect from "@/app/components/LocationSelect";
import { isIOSNative } from "@/lib/native";

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
  region_id: string | null;
  district_id: string | null;
  notify_on_requests: boolean | null;
  sms_opt_in: boolean | null;
  sms_phone_verified: boolean | null;
  ares_reverify_opt_out: boolean | null;
  bank_account: string | null;
  bank_verification_amount: number | null;
  bank_verification_status: string | null;
  bank_verification_reference: string | null;
  bank_verification_initiated_at: string | null;
  bank_verification_verified_at: string | null;
  subscription_type: string | null;
};

type ProviderProfile = {
  id: string;
  bio: string | null;
  locations: string[] | null;
  hourly_rate: number | null;
};

export default function FachmanProfil() {
  const router = useRouter();
  // App Store: na iOS žádné navádění k nákupu (3.1.1) — skryjeme upgrade na vyšší tarif.
  const [isIos, setIsIos] = useState(false);
  useEffect(() => setIsIos(isIOSNative()), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  // Trvalé smazání účtu (App Store 5.1.1(v))
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Účet se nepodařilo smazat. Zkuste to znovu nebo napište na info@fachmani.org.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/?deleted=1");
    } catch {
      alert("Síťová chyba. Zkuste to prosím znovu.");
      setDeleting(false);
    }
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesLimit, setCategoriesLimit] = useState<number | null>(null);

  // Formulářová data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [locations, setLocations] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [description, setDescription] = useState("");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [ico, setIco] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifyOnRequests, setNotifyOnRequests] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [aresOptOut, setAresOptOut] = useState(false);
  const [bankAccount, setBankAccount] = useState("");
  const [bankInitiating, setBankInitiating] = useState(false);
  const [bankInfo, setBankInfo] = useState<{
    amount_kc: string;
    reference_vs: string;
    target_account: string;
    target_iban: string | null;
    qr_data_url: string | null;
    instructions: string;
  } | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  // Univerzální preview QR (bez VS) — fachman vidí účet ihned po otevření profilu,
  // ještě před zadáním vlastního čísla účtu. Slouží jen k transparentnosti
  // (skutečné párování platby běží přes per-user VS).
  const [bankTarget, setBankTarget] = useState<{
    target_account: string;
    target_iban: string | null;
    amount_kc: string;
    qr_data_url: string | null;
  } | null>(null);
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

      // Načteme profil (bez phone — je column-level REVOKED; čte se přes RPC)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, description, location, ico, avatar_url, is_verified, subscription_type, created_at, ares_verified_at, ares_verified_name, region_id, district_id, notify_on_requests, sms_opt_in, sms_phone_verified, ares_reverify_opt_out, bank_account, bank_verification_amount, bank_verification_status, bank_verification_reference, bank_verification_initiated_at, bank_verification_verified_at")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        router.push("/auth/login");
        return;
      }

      const { data: ownPhone } = await supabase
        .rpc("get_provider_phone", { p_provider_id: user.id });

      setProfile({ ...profileData, phone: (ownPhone as string | null) ?? null });
      setFullName(profileData.full_name || "");
      setPhone((ownPhone as string | null) ?? "");
      setDescription(profileData.description || "");
      setRegionId(profileData.region_id || null);
      setDistrictId(profileData.district_id || null);
      setIco(profileData.ico || "");
      setAvatarUrl(profileData.avatar_url || null);
      setNotifyOnRequests(profileData.notify_on_requests ?? true);
      setSmsOptIn(profileData.sms_opt_in ?? false);
      setAresOptOut(profileData.ares_reverify_opt_out ?? false);
      setBankAccount(profileData.bank_account ?? "");

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

      // C.F2 — limit kategorií podle tarifu
      const { data: settingsRow } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "platform_settings")
        .single();
      const tier = profileData.subscription_type || "free";
      let limit: number | null = null;
      if (tier === "business") {
        limit = null; // neomezeno
      } else if (tier === "premium") {
        limit = settingsRow?.value?.premium_categories_limit ?? 3;
      } else {
        limit = settingsRow?.value?.free_categories_limit ?? 1;
      }
      setCategoriesLimit(limit);

      setLoading(false);
    }

    loadData();

    // Univerzální QR + číslo účtu (bez VS) — pro transparentnost ještě před
    // tím, než fachman zadá svoje číslo účtu.
    fetch("/api/bank-verification/target")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object") setBankTarget(d);
      })
      .catch(() => undefined);
  }, [router]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const isSelected = prev.includes(categoryId);
      if (isSelected) return prev.filter((id) => id !== categoryId);
      // C.F2 — gate select pokud at limit
      if (categoriesLimit !== null && prev.length >= categoriesLimit) {
        setMessage(`Limit kategorií vyčerpán (${categoriesLimit}). Pro více kategorií upgradujte tarif.`);
        return prev;
      }
      return [...prev, categoryId];
    });
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

  const handleBankInitiate = async () => {
    setBankError(null);
    setBankInfo(null);
    if (!bankAccount.trim()) {
      setBankError("Zadejte číslo účtu");
      return;
    }
    setBankInitiating(true);
    try {
      const res = await fetch("/api/bank-verification/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: bankAccount.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBankError(data.error || "Chyba při spuštění ověření");
      } else {
        setBankInfo({
          amount_kc: data.amount_kc,
          reference_vs: data.reference_vs,
          target_account: data.target_account,
          target_iban: data.target_iban ?? null,
          qr_data_url: data.qr_data_url ?? null,
          instructions: data.instructions,
        });
        // Refresh profile aby UI ukázalo "pending" stav
        if (profile) {
          setProfile({
            ...profile,
            bank_account: bankAccount.trim(),
            bank_verification_status: "pending",
            bank_verification_amount: Math.round(parseFloat(data.amount_kc) * 100),
            bank_verification_reference: data.reference_vs,
            bank_verification_initiated_at: data.initiated_at,
          });
        }
      }
    } catch (e) {
      setBankError(e instanceof Error ? e.message : "Síťová chyba");
    } finally {
      setBankInitiating(false);
    }
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
    if (districtId && !regionId) { setMessage("Okres nelze uložit bez zvoleného kraje."); setSaving(false); return; }

    try {
      // Aktualizujeme základní profil
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          description: description || null,
          region_id: regionId,
          district_id: districtId,
          ico: ico || null,
          notify_on_requests: notifyOnRequests,
          sms_opt_in: smsOptIn,
          ares_reverify_opt_out: aresOptOut,
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
                {profile?.role === "provider" && profile?.subscription_type !== "premium" && profile?.subscription_type !== "business" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mt-2">
                    🔒 Vaše telefonní číslo se poptávajícím <strong>nezobrazuje</strong>.
                    Veřejně viditelné je pouze u Premium / Business účtů. Zákazníci vám napíší přes interní chat;
                    telefon uvidí jen na poptávkách, kam jste poslal nabídku.
                  </p>
                )}
                {profile?.role === "provider" && (profile?.subscription_type === "premium" || profile?.subscription_type === "business") && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-2">
                    ✓ Vaše telefonní číslo je <strong>veřejně viditelné</strong> ve vašem profilu (Premium).
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sídlo / hlavní lokalita
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Vyberte kraj a okres, kde máte sídlo. Používá se pro filtrování ve veřejném seznamu.
                </p>
                <LocationSelect
                  regionId={regionId}
                  districtId={districtId}
                  onChange={({ regionId: nextRegion, districtId: nextDistrict }) => {
                    setRegionId(nextRegion);
                    setDistrictId(nextDistrict);
                  }}
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
                {ico && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aresOptOut}
                        onChange={(e) => setAresOptOut(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-gray-600"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Nepřevěřovat údaje z ARES</div>
                        <div className="text-xs text-gray-600">
                          Vypne pravidelnou automatickou kontrolu vašich údajů v rejstříku ARES.
                          Doporučujeme nechat zapnuté — udržuje váš profil aktuální.
                        </div>
                      </div>
                    </label>
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

              <div className="mt-6 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnRequests}
                    onChange={(e) => setNotifyOnRequests(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-cyan-600"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">🎯 Upozorňovat na nové poptávky</div>
                    <div className="text-sm text-gray-600">
                      Dostávejte notifikaci pokaždé, když přijde poptávka odpovídající vašim kategoriím a regionu.
                      Vypnutím přestanete dostávat tyto notifikace, ale stále vás můžeme zobrazit zákazníkům ve vyhledávání.
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="font-semibold text-gray-900 mb-1">🔔 Push notifikace v prohlížeči</div>
                <p className="text-sm text-gray-600 mb-2">
                  Okamžitá notifikace v prohlížeči nebo na mobilu (po přidání na plochu) když přijde nová poptávka.
                </p>
                <PushOptIn />
              </div>

              <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    disabled={profile?.subscription_type !== "premium"}
                    className="mt-1 w-5 h-5 accent-amber-600 disabled:opacity-50"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      ⚡ SMS na PRIORITNÍ poptávky
                      {profile?.subscription_type !== "premium" && (
                        <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">Premium</span>
                      )}
                      {profile?.sms_phone_verified === false && smsOptIn && (
                        <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full">
                          telefon neověřen
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Dostanete SMS, když přijde PRIORITNÍ poptávka — můžete být první kdo nabídne.
                      {profile?.subscription_type !== "premium" && " Funkce je pro Premium uživatele."}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Categories section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              {Icons.star} Kategorie služeb
              {categoriesLimit !== null ? (
                <span
                  className={`ml-2 text-sm font-medium px-2 py-0.5 rounded-full ${
                    selectedCategories.length >= categoriesLimit
                      ? "bg-amber-100 text-amber-800"
                      : "bg-cyan-100 text-cyan-800"
                  }`}
                >
                  {selectedCategories.length}/{categoriesLimit}
                </span>
              ) : (
                <span className="ml-2 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedCategories.length} (neomezeno)
                </span>
              )}
            </h2>
            <p className="text-gray-600 text-sm mb-2">Vyberte kategorie, ve kterých nabízíte své služby</p>
            {categoriesLimit !== null && selectedCategories.length >= categoriesLimit && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between gap-3">
                <span>
                  Dosáhli jste limitu {categoriesLimit} {categoriesLimit === 1 ? "kategorie" : "kategorií"} pro váš tarif{" "}
                  <strong>{profile?.subscription_type || "free"}</strong>.
                  {!isIos && " Pro více kategorií přejděte na vyšší tarif."}
                </span>
                {!isIos && (
                  <Link
                    href="/cenik"
                    className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap hover:bg-amber-700"
                  >
                    Upgradovat
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-6">
              {categories
                .filter((c) => c.parent_id === null)
                .map((main) => {
                  const subs = categories.filter((c) => c.parent_id === main.id);
                  const mainSelected = selectedCategories.includes(main.id);
                  const mainAtLimit = !mainSelected && categoriesLimit !== null && selectedCategories.length >= categoriesLimit;
                  return (
                    <div key={main.id}>
                      <label
                        className={`flex items-center p-4 border-2 rounded-xl transition-all mb-2 ${
                          mainSelected
                            ? "border-cyan-500 bg-cyan-50 cursor-pointer"
                            : mainAtLimit
                              ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={mainSelected}
                          disabled={mainAtLimit}
                          onChange={() => handleCategoryToggle(main.id)}
                          className="sr-only"
                        />
                        <span className="text-2xl mr-3">{main.icon}</span>
                        <span
                          className={`font-bold ${
                            mainSelected ? "text-cyan-700" : "text-gray-900"
                          }`}
                        >
                          {main.name}
                        </span>
                        {mainSelected && (
                          <span className="ml-auto text-cyan-500">{Icons.check}</span>
                        )}
                      </label>

                      {subs.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                          {subs.map((sub) => {
                            const subSelected = selectedCategories.includes(sub.id);
                            const subAtLimit = !subSelected && categoriesLimit !== null && selectedCategories.length >= categoriesLimit;
                            return (
                              <label
                                key={sub.id}
                                className={`flex items-center p-3 border rounded-lg transition-all text-sm ${
                                  subSelected
                                    ? "border-cyan-400 bg-cyan-50 cursor-pointer"
                                    : subAtLimit
                                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={subSelected}
                                  disabled={subAtLimit}
                                  onChange={() => handleCategoryToggle(sub.id)}
                                  className="sr-only"
                                />
                                <span className="text-base mr-2">{sub.icon}</span>
                                <span
                                  className={`${
                                    subSelected ? "text-cyan-700" : "text-gray-700"
                                  }`}
                                >
                                  {sub.name}
                                </span>
                                {subSelected && (
                                  <span className="ml-auto text-cyan-500">{Icons.check}</span>
                                )}
                              </label>
                            );
                          })}
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

        {/* A.F5 — Bankovní ověření */}
        <div id="bank-verification" className={`mt-6 bg-white rounded-2xl shadow-lg p-8 border-2 scroll-mt-32 ${
          profile?.bank_verification_status === "verified" ? "border-green-200" :
          profile?.bank_verification_status === "pending" ? "border-yellow-300" :
          "border-amber-300 ring-4 ring-amber-100"
        }`}>
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              profile?.bank_verification_status === "verified" ? "bg-green-100" :
              profile?.bank_verification_status === "pending" ? "bg-yellow-100" :
              "bg-amber-100"
            }`}>
              {profile?.bank_verification_status === "verified" ? "✅" : "💳"}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">Ověření identity (2 kroky)</h3>
              {profile?.bank_verification_status !== "verified" && (
                <p className="text-sm text-amber-800 mt-1 font-semibold">
                  Bez ověření nemůžete posílat nabídky a u vašeho profilu se zobrazí badge „Neověřeno".
                </p>
              )}
              <ol className="text-xs text-gray-600 mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <span className={`inline-flex w-5 h-5 rounded-full text-white text-[10px] font-bold items-center justify-center ${
                    profile?.ares_verified_at ? "bg-green-500" : "bg-gray-300"
                  }`}>1</span>
                  ARES kontrola IČO
                  {profile?.ares_verified_at ? <span className="text-green-700 font-semibold">✓ Hotovo</span> : <span className="text-gray-500">— vyplněním IČO výše</span>}
                </li>
                <li className="flex items-center gap-2">
                  <span className={`inline-flex w-5 h-5 rounded-full text-white text-[10px] font-bold items-center justify-center ${
                    profile?.bank_verification_status === "verified" ? "bg-green-500" :
                    profile?.bank_verification_status === "pending" ? "bg-yellow-500" :
                    "bg-gray-300"
                  }`}>2</span>
                  Symbolická 1 Kč platba z vašeho podnikatelského účtu
                  {profile?.bank_verification_status === "verified" ? <span className="text-green-700 font-semibold">✓ Ověřeno</span> :
                   profile?.bank_verification_status === "pending" ? <span className="text-yellow-700 font-semibold">⏳ Čeká</span> :
                   null}
                </li>
              </ol>
              {profile?.bank_verification_status !== "verified" && (
                <p className="text-xs text-gray-500 mt-3 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <strong>Proč 1 Kč platba?</strong> Tímto si ověříte, že podnikatelský účet, který uvádíte, opravdu patří vám.
                  Číslo účtu zadáte níž — vygenerujeme variabilní symbol a QR kód. Pošlete přesně 1 Kč
                  ze svého firemního účtu a admin platbu potvrdí (typicky do 24 h).
                </p>
              )}
            </div>
          </div>

          {profile?.bank_verification_status === "verified" ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              ✅ <strong>Účet ověřen</strong> ({profile.bank_account}). Ověřeno{" "}
              {profile.bank_verification_verified_at
                ? new Date(profile.bank_verification_verified_at).toLocaleDateString("cs-CZ")
                : ""}.
            </div>
          ) : profile?.bank_verification_status === "pending" || bankInfo ? (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
                ⏳ <strong>Čeká na potvrzení adminem</strong>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-yellow-700 uppercase">Částka</div>
                    <div className="font-mono font-bold">
                      {bankInfo?.amount_kc
                        ?? (profile?.bank_verification_amount
                          ? (profile.bank_verification_amount / 100).toFixed(2)
                          : "—")} Kč
                    </div>
                  </div>
                  <div>
                    <div className="text-yellow-700 uppercase">Variabilní symbol</div>
                    <div className="font-mono font-bold">
                      {bankInfo?.reference_vs ?? profile?.bank_verification_reference ?? "—"}
                    </div>
                  </div>
                </div>
                {bankInfo?.qr_data_url && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
                    <div className="bg-white rounded-lg p-2 border border-yellow-300 shrink-0">
                      <img
                        src={bankInfo.qr_data_url}
                        alt={`QR platba ${bankInfo.amount_kc} Kč, VS ${bankInfo.reference_vs}`}
                        width={180}
                        height={180}
                        className="block"
                      />
                      <div className="text-[10px] text-center text-gray-500 mt-1">QR platba</div>
                    </div>
                    <div className="flex-1 text-xs space-y-2">
                      <div>
                        <div className="text-yellow-700 uppercase">Číslo účtu</div>
                        <div className="font-mono font-bold break-all">{bankInfo.target_account}</div>
                      </div>
                      {bankInfo.target_iban && (
                        <div>
                          <div className="text-yellow-700 uppercase">IBAN</div>
                          <div className="font-mono font-bold break-all">{bankInfo.target_iban}</div>
                        </div>
                      )}
                      <div className="text-yellow-800 leading-relaxed">
                        Naskenujte QR ve své bankovní aplikaci, nebo zadejte ručně číslo účtu, částku a VS.
                      </div>
                    </div>
                  </div>
                )}
                {bankInfo && (
                  <div className="mt-3 text-xs text-yellow-800">{bankInfo.instructions}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Univerzální preview — fachman vidí náš účet ihned, ještě před zadáním
                  vlastního čísla účtu. Skutečné párování běží přes per-user VS po kliknutí
                  na „Spustit ověření" — preview QR sám o sobě platbu nepřiřadí. */}
              {bankTarget && bankTarget.target_account && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🛡️</div>
                    <div className="flex-1 text-sm text-emerald-900">
                      <div className="font-semibold">Posíláte 1 Kč na náš účet — bez rizika zneužití</div>
                      <ul className="mt-1.5 text-xs space-y-1 text-emerald-800/90 list-disc list-inside">
                        <li>Platíte vy nám — k vašemu účtu nemáme žádný přístup ani autorizaci.</li>
                        <li>Z platby si přečteme jen číslo účtu odesílatele (ověření vlastnictví) a variabilní symbol.</li>
                        <li>1 Kč je symbolická částka — neslouží k pravidelnému inkasu.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start pt-2 border-t border-emerald-200">
                    {bankTarget.qr_data_url && (
                      <div className="bg-white rounded-lg p-2 border border-emerald-300 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={bankTarget.qr_data_url}
                          alt={`QR platba 1 Kč na ${bankTarget.target_account}`}
                          width={160}
                          height={160}
                          className="block"
                        />
                        <div className="text-[10px] text-center text-emerald-700 mt-1">Náhled QR</div>
                      </div>
                    )}
                    <div className="flex-1 text-xs space-y-1.5">
                      <div>
                        <div className="text-emerald-700 uppercase tracking-wider text-[10px]">Náš účet</div>
                        <div className="font-mono font-bold text-emerald-900 break-all">{bankTarget.target_account}</div>
                      </div>
                      {bankTarget.target_iban && (
                        <div>
                          <div className="text-emerald-700 uppercase tracking-wider text-[10px]">IBAN</div>
                          <div className="font-mono font-bold text-emerald-900 break-all">{bankTarget.target_iban}</div>
                        </div>
                      )}
                      <div className="text-emerald-800/80 leading-relaxed pt-1">
                        ⚠️ Pro ověření prosím <strong>nepoužívejte tento náhledový QR</strong> —
                        po kliknutí na „Spustit ověření" vám vygenerujeme QR s vlastním
                        variabilním symbolem, podle kterého vaši platbu přiřadíme.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Číslo vašeho podnikatelského účtu
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="např. 1234567890/0100"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Z tohoto účtu pošlete 1 Kč. Číslo si uložíme abychom platbu přiřadili k vašemu profilu.
                </p>
              </div>
              {bankError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {bankError}
                </div>
              )}
              <button
                type="button"
                onClick={handleBankInitiate}
                disabled={bankInitiating || !bankAccount.trim()}
                className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {bankInitiating ? "Připravuji..." : "Spustit ověření a vygenerovat QR s VS"}
              </button>
            </div>
          )}
        </div>

        {/* Preview link */}
        <div className={`mt-6 text-center ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <Link 
            href={`/fachman/${profile?.id}`}
            className="text-cyan-600 hover:text-cyan-700 font-semibold"
          >
            Zobrazit můj veřejný profil →
          </Link>
        </div>

        {/* Danger zone — trvalé smazání účtu (App Store guideline 5.1.1(v)) */}
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-bold text-red-700 mb-2">Smazat účet</h2>
          <p className="text-sm text-gray-600 mb-4">
            Trvalé smazání účtu odstraní váš profil, poptávky, nabídky, recenze, zprávy a osobní
            údaje. Tuto akci nelze vrátit zpět. Účetní doklady zůstávají anonymizovaně archivované
            v souladu se zákonem.
          </p>
          {!showDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Trvale smazat účet
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Pro potvrzení napište do pole níže <strong>SMAZAT</strong>:
              </p>
              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="SMAZAT"
                className="w-full max-w-xs rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={deleteText.trim().toUpperCase() !== "SMAZAT" || deleting}
                  onClick={handleDeleteAccount}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Mažu účet…" : "Potvrdit trvalé smazání"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDelete(false); setDeleteText(""); }}
                  disabled={deleting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}
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