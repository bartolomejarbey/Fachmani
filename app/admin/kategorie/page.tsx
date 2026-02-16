"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
};

export default function AdminKategorie() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Formulář
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      await loadCategories();
      setLoading(false);
    }

    checkAdminAndLoad();
  }, [router]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (data) {
      setCategories(data);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingId) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const categoryData = {
      name,
      slug,
      icon,
      description: description || null,
    };

    if (editingId) {
      await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingId);
    } else {
      await supabase
        .from("categories")
        .insert(categoryData);
    }

    await loadCategories();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setIcon(category.icon);
    setDescription(category.description || "");
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Opravdu chcete smazat tuto kategorii? Tato akce může ovlivnit existující poptávky.")) {
      return;
    }

    await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    await loadCategories();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSlug("");
    setIcon("");
    setDescription("");
  };

  const commonIcons = ["🔧", "⚡", "🔨", "🎨", "🏠", "🚗", "💻", "📱", "🌿", "🧹", "📦", "🔒", "💡", "🚿", "❄️", "🔥", "📸", "✂️", "🧰", "🛠️"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigace */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="text-xl font-bold">
              Fachmani Admin
            </Link>
            <div className="flex space-x-4">
              <Link href="/admin" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/uzivatele" className="text-gray-300 hover:text-white">
                Uživatelé
              </Link>
              <Link href="/admin/poptavky" className="text-gray-300 hover:text-white">
                Poptávky
              </Link>
              <Link href="/admin/kategorie" className="text-white font-medium">
                Kategorie
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Kategorie</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Přidat kategorii
          </button>
        </div>

        {/* Formulář */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Upravit kategorii" : "Nová kategorie"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Název *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="např. Elektrikář"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="např. elektrikar"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ikona *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    required
                    placeholder="např. ⚡"
                    className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl"
                  />
                  <span className="text-gray-500 self-center">nebo vyberte:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border hover:bg-gray-100 ${
                        icon === emoji ? "bg-blue-100 border-blue-500" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Popis
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Krátký popis kategorie..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Přidat kategorii"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-600 px-6 py-2 hover:text-gray-900"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Seznam kategorií */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ikona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Název
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Popis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-2xl">
                    {category.icon}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Upravit
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Smazat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Žádné kategorie. Přidejte první kategorii.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}