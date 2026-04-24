"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ImageCropper from "@/app/components/ImageCropper";

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  sort_order: number | null;
};

export default function NovaPoptavka() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [expiryDays, setExpiryDays] = useState(30); // Default

  const [title, setTitle] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      // Načteme pouze aktivní kategorie
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon, parent_id, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Načteme nastavení expirace z databáze
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "platform_settings")
        .single();

      if (settingsData?.value?.request_expiry_days) {
        setExpiryDays(settingsData.value.request_expiry_days);
      }

      setPageLoading(false);
    }

    loadData();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      setError("Maximálně 5 fotek.");
      return;
    }
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Soubor "${file.name}" není povolený. Použijte JPG, PNG nebo WebP.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`Soubor "${file.name}" je větší než 5 MB.`);
        return;
      }
    }
    // Open cropper for first file
    if (files.length > 0) {
      setPendingFile(files[0]);
      const reader = new FileReader();
      reader.onload = (ev) => setCropSource(ev.target?.result as string);
      reader.readAsDataURL(files[0]);
    }
    // Reset input so same file can be re-selected
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
    const preview = URL.createObjectURL(blob);
    setImageFiles((prev) => [...prev, { file, preview }]);
    setCropSource(null);
    setPendingFile(null);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (budgetMin && (parseInt(budgetMin) < 0 || parseInt(budgetMin) > 5000000)) {
      setError("Rozpočet musí být 0–5 000 000 Kč.");
      setLoading(false);
      return;
    }
    if (budgetMax && (parseInt(budgetMax) < 0 || parseInt(budgetMax) > 5000000)) {
      setError("Rozpočet musí být 0–5 000 000 Kč.");
      setLoading(false);
      return;
    }
    if (budgetMin && budgetMax && parseInt(budgetMin) > parseInt(budgetMax)) {
      setError("Rozpočet od nemůže být větší než rozpočet do.");
      setLoading(false);
      return;
    }
    if (preferredDate && new Date(preferredDate) < new Date(new Date().toDateString())) {
      setError("Preferovaný termín nemůže být v minulosti.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?redirect=/nova-poptavka");
      return;
    }

    // Upload images
    const imageUrls: string[] = [];
    for (const img of imageFiles) {
      const ext = img.file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("demand-images")
        .upload(fileName, img.file);
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("demand-images")
          .getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }
    }

    // Vypočítáme datum expirace podle nastavení
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data, error: insertError } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        category_id: categoryId || null,
        title,
        description,
        location,
        postal_code: postalCode || null,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_date: preferredDate || null,
        status: "active",
        expires_at: expiresAt.toISOString(),
        images: imageUrls.length > 0 ? imageUrls : [],
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/poptavka/${data.id}`);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nová poptávka</h1>
          <p className="text-gray-600">Popište co potřebujete a získejte nabídky od ověřených fachmanů</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Název poptávky *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="např. Výměna vodovodní baterie"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hlavní kategorie *
              </label>
              <select
                value={mainCategoryId}
                onChange={(e) => {
                  setMainCategoryId(e.target.value);
                  setCategoryId(e.target.value);
                }}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              >
                <option value="">Vyberte hlavní kategorii</option>
                {categories
                  .filter((c) => c.parent_id === null)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Podkategorie
              </label>
              <select
                value={categoryId === mainCategoryId ? "" : categoryId}
                onChange={(e) => setCategoryId(e.target.value || mainCategoryId)}
                disabled={!mainCategoryId || categories.filter((c) => c.parent_id === mainCategoryId).length === 0}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">(volitelné) Upřesnit</option>
                {categories
                  .filter((c) => c.parent_id === mainCategoryId)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Popis *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              maxLength={2000}
              placeholder="Popište co potřebujete, jaký je stav, případně další detaily..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotky (max 5, max 5 MB každá)
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imageFiles.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {imageFiles.length < 5 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-cyan-400 flex flex-col items-center justify-center text-gray-400 hover:text-cyan-500 transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-xs mt-1">Přidat</span>
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Image Cropper Modal */}
          {cropSource && (
            <ImageCropper
              imageSrc={cropSource}
              aspectRatio={16 / 9}
              maxWidth={1200}
              onCropComplete={handleCropComplete}
              onCancel={() => { setCropSource(null); setPendingFile(null); }}
            />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Město / Obec *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="např. Praha"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PSČ
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="např. 11000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rozpočet od (Kč)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="např. 1000"
                step="100"
                min="100"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rozpočet do (Kč)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="např. 5000"
                step="100"
                min="100"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferovaný termín
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-xl">
            <p className="text-sm text-cyan-800">
              ℹ️ Poptávka bude aktivní <strong>{expiryDays} dní</strong>. Během této doby vám budou moci ověření fachmani posílat své nabídky.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
          >
            {loading ? "Odesílám..." : "Zveřejnit poptávku"}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  );
}