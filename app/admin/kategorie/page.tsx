"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useRouter } from "next/navigation";
import { type Category, type CategoryTree, buildTree } from "@/app/types/category";

export default function AdminKategorie() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string | "">("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("admin_role")
        .eq("id", user.id)
        .single();
      if (!profile?.admin_role) {
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
      .select("id, name, slug, icon, description, parent_id, sort_order")
      .order("sort_order")
      .order("name");
    if (data) setCategories(data as Category[]);
  };

  const tree: CategoryTree[] = useMemo(() => buildTree(categories), [categories]);
  const mainCategories = useMemo(
    () => categories.filter((c) => c.parent_id === null).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "cs")),
    [categories]
  );

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
    if (!editingId) setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (name.length === 0 || name.length > 200) {
      setMessage("Název musí mít 1–200 znaků.");
      setSaving(false);
      return;
    }
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      setMessage("Slug smí obsahovat jen malá písmena, číslice a pomlčky (max 80).");
      setSaving(false);
      return;
    }

    // Při editaci: rodič nesmí být sám sebou ani vlastním potomkem.
    if (editingId && parentId) {
      if (parentId === editingId) {
        setMessage("Kategorie nemůže být vlastním rodičem.");
        setSaving(false);
        return;
      }
      const parentCandidate = categories.find((c) => c.id === parentId);
      if (parentCandidate?.parent_id !== null) {
        setMessage("Rodič musí být hlavní kategorie (bez dalšího rodiče).");
        setSaving(false);
        return;
      }
    }

    const payload = {
      name,
      slug,
      icon,
      description: description || null,
      parent_id: parentId || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert(payload);

    if (error) {
      setMessage(`Chyba uložení: ${error.message}`);
      setSaving(false);
      return;
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
    setParentId(category.parent_id || "");
    setSortOrder(category.sort_order);
    setShowForm(true);
    setMessage(null);
  };

  const handleDelete = async (category: Category) => {
    // Kontrola: má děti?
    const childCount = categories.filter((c) => c.parent_id === category.id).length;
    if (childCount > 0) {
      alert(`Kategorie má ${childCount} podkategorií. Nejprve je přesuňte jinam nebo smažte.`);
      return;
    }

    // Kontrola: je používána?
    const [{ count: providersCount }, { count: requestsCount }, { count: offersCount }] = await Promise.all([
      supabase.from("provider_categories").select("*", { count: "exact", head: true }).eq("category_id", category.id),
      supabase.from("requests").select("*", { count: "exact", head: true }).eq("category_id", category.id),
      supabase.from("service_offers").select("*", { count: "exact", head: true }).eq("category_id", category.id),
    ]);

    const usedBy = (providersCount || 0) + (requestsCount || 0) + (offersCount || 0);
    if (usedBy > 0) {
      if (!confirm(`Kategorie je používána: ${providersCount || 0}× fachman, ${requestsCount || 0}× poptávka, ${offersCount || 0}× nabídka. Opravdu smazat?`)) {
        return;
      }
    } else if (!confirm("Opravdu smazat tuto kategorii?")) {
      return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) {
      alert(`Chyba smazání: ${error.message}`);
      return;
    }
    await loadCategories();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSlug("");
    setIcon("");
    setDescription("");
    setParentId("");
    setSortOrder(0);
    setMessage(null);
  };

  const commonIcons = ["🔧","⚡","🔨","🎨","🏠","🚗","💻","📱","🌿","🧹","📦","🔒","💡","🚿","❄️","🔥","📸","✂️","🧰","🛠️","🏗️","🪵","🔩","🚚","💆","📚"];

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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📂 Kategorie</h1>
            <p className="text-slate-400">
              Celkem {categories.length} kategorií · {mainCategories.length} hlavních · 2-úrovňová hierarchie
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
          >
            + Přidat kategorii
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? "Upravit kategorii" : "Nová kategorie"}
            </h2>

            {message && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-300 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Název *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="např. Elektrikář"
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="např. elektrikar"
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nadřazená kategorie</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">— Žádná (hlavní kategorie) —</option>
                    {mainCategories.filter((m) => m.id !== editingId).map((m) => (
                      <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Pořadí (nižší = výš)</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ikona *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    required
                    placeholder="např. ⚡"
                    className="w-24 px-3 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-center text-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-500 self-center">nebo vyberte:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border border-white/10 hover:bg-white/10 transition-colors ${
                        icon === emoji ? "bg-cyan-500/20 border-cyan-500" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Popis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Krátký popis kategorie..."
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Přidat kategorii"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stromové zobrazení */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {tree.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Žádné kategorie.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {tree.map((main) => (
                <div key={main.id}>
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{main.icon}</span>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{main.name}</p>
                        <p className="text-xs text-slate-400">slug: {main.slug} · pořadí: {main.sort_order} · {main.children.length} podkategorií</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleEdit(main)} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors">Upravit</button>
                      <button onClick={() => handleDelete(main)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">Smazat</button>
                    </div>
                  </div>
                  {main.children.length > 0 && (
                    <div className="pl-10 bg-slate-900/40">
                      {main.children.map((child) => (
                        <div key={child.id} className="px-6 py-3 flex items-center justify-between border-t border-white/5 hover:bg-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">{child.icon}</span>
                            <div className="min-w-0">
                              <p className="text-slate-200 truncate">{child.name}</p>
                              <p className="text-xs text-slate-500">slug: {child.slug} · pořadí: {child.sort_order}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleEdit(child)} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors">Upravit</button>
                            <button onClick={() => handleDelete(child)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors">Smazat</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
