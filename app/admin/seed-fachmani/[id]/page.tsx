"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../../components/AdminLayout";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  icon: string;
};

const locations = [
  "Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", 
  "České Budějovice", "Hradec Králové", "Pardubice", "Zlín",
  "Ústí nad Labem", "Karlovy Vary", "Jihlava", "Kladno", "Most"
];

export default function SeedFachmanForm() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  const id = isNew ? null : params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [rating, setRating] = useState("4.5");
  const [reviewCount, setReviewCount] = useState("0");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCategories();
    if (!isNew && id) {
      loadProvider(id);
    }
  }, [id, isNew]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, icon").order("name");
    setCategories(data || []);
  };

  const loadProvider = async (providerId: string) => {
    const { data } = await supabase
      .from("seed_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (data) {
      setFullName(data.full_name);
      setEmail(data.email);
      setPhone(data.phone || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
      setHourlyRate(data.hourly_rate?.toString() || "");
      setRating(data.rating?.toString() || "4.5");
      setReviewCount(data.review_count?.toString() || "0");
      setSelectedLocations(data.locations || []);
      setSelectedCategories(data.category_ids || []);
      setIsVerified(data.is_verified);
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const providerData = {
      full_name: fullName,
      email,
      phone: phone || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
      rating: parseFloat(rating),
      review_count: parseInt(reviewCount),
      locations: selectedLocations,
      category_ids: selectedCategories,
      is_verified: isVerified,
      is_active: isActive,
      created_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      await supabase.from("seed_providers").insert(providerData);
    } else {
      await supabase.from("seed_providers").update(providerData).eq("id", id);
    }

    // Log activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: isNew ? "create_seed_provider" : "update_seed_provider",
      target_type: "seed_provider",
      target_id: id,
      details: { name: fullName },
    });

    router.push("/admin/seed-fachmani");
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc)
        ? prev.filter(l => l !== loc)
        : [...prev, loc]
    );
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    );
  };

  const generateRandomEmail = () => {
    const name = fullName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ".");
    setEmail(`${name}@fachman.cz`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/seed-fachmani" className="text-slate-400 hover:text-white mb-4 inline-block">
            ← Zpět na seznam
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {isNew ? "🎭 Nový fiktivní fachman" : "✏️ Upravit fiktivního fachmana"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Základní info */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">👤 Základní údaje</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Celé jméno *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jan Novák"
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email *
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="jan.novak@fachman.cz"
                    className="flex-1 px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={generateRandomEmail}
                    className="px-3 py-2 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-colors"
                    title="Vygenerovat email"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 123 456 789"
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hodinová sazba (Kč)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="500"
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bio / Popis
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Zkušený elektrikář s 15 lety praxe..."
                className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Hodnocení */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">⭐ Hodnocení</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Průměrné hodnocení (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Počet recenzí
                </label>
                <input
                  type="number"
                  min="0"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Kategorie */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">📁 Kategorie</h2>
            <p className="text-slate-400 text-sm mb-4">Vyberte kategorie, ve kterých fachman působí</p>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedCategories.includes(cat.id)
                      ? "bg-cyan-500 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lokality */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">📍 Lokality</h2>
            <p className="text-slate-400 text-sm mb-4">Kde fachman působí</p>
            
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedLocations.includes(loc)
                      ? "bg-emerald-500 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Nastavení */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">⚙️ Nastavení</h2>
            
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-5 h-5 rounded bg-slate-700 border-white/20 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-white">✅ Ověřený (BankID badge)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded bg-slate-700 border-white/20 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-white">🟢 Aktivní (zobrazuje se na webu)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? "Ukládám..." : isNew ? "Vytvořit fachmana" : "Uložit změny"}
            </button>
            <Link
              href="/admin/seed-fachmani"
              className="px-8 py-4 bg-white/5 text-slate-400 rounded-xl font-medium hover:bg-white/10 transition-colors text-center"
            >
              Zrušit
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}