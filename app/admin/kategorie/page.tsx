"use client";

import { useEffect, useState, type ReactElement } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useRouter } from "next/navigation";
import IconPicker from "@/app/components/IconPicker";
import CategoryIcon from "@/app/components/CategoryIcon";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean;
};

export default function AdminKategorie() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});

  // Formulář
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
    // Admin vidí VŠECHNY kategorie včetně deaktivovaných (is_active filter NEPOUŽÍVAT)
    const [catsRes, pcRes, reqRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name"),
      supabase.from("provider_categories").select("category_id"),
      supabase.from("requests").select("category_id"),
    ]);

    if (catsRes.data) {
      setCategories(catsRes.data);
    }

    const pCounts: Record<string, number> = {};
    (pcRes.data || []).forEach((row: { category_id: string }) => {
      pCounts[row.category_id] = (pCounts[row.category_id] || 0) + 1;
    });
    setProviderCounts(pCounts);

    const rCounts: Record<string, number> = {};
    (reqRes.data || []).forEach((row: { category_id: string }) => {
      rCounts[row.category_id] = (rCounts[row.category_id] || 0) + 1;
    });
    setRequestCounts(rCounts);
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
      parent_id: parentId || null,
      sort_order: sortOrder ? parseInt(sortOrder, 10) : null,
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
    setParentId(category.parent_id || "");
    setSortOrder(category.sort_order !== null ? String(category.sort_order) : "");
    setShowForm(true);
  };

  const handleToggleActive = async (category: Category) => {
    const nextState = !category.is_active;
    const verb = nextState ? "reaktivovat" : "deaktivovat";
    const isMain = category.parent_id === null;
    const childCount = isMain
      ? categories.filter((c) => c.parent_id === category.id).length
      : 0;
    const cascadeMsg = isMain && childCount > 0
      ? ` Tím se ${verb === "deaktivovat" ? "deaktivuje" : "reaktivuje"} i ${childCount} podkategorií.`
      : "";
    if (!confirm(`Opravdu chcete ${verb} kategorii "${category.name}"?${cascadeMsg}`)) {
      return;
    }
    await supabase
      .from("categories")
      .update({ is_active: nextState })
      .eq("id", category.id);

    if (isMain && childCount > 0) {
      await supabase
        .from("categories")
        .update({ is_active: nextState })
        .eq("parent_id", category.id);
    }

    await loadCategories();
  };

  const handleAddSub = (parent: Category) => {
    resetForm();
    setParentId(parent.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSlug("");
    setIcon("");
    setDescription("");
    setParentId("");
    setSortOrder("");
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📂 Kategorie</h1>
            <p className="text-slate-400">
              <span className="text-cyan-400">{categories.filter((c) => c.parent_id === null).length} hlavních</span>
              {" · "}
              <span className="text-slate-300">{categories.filter((c) => c.parent_id !== null).length} podkategorií</span>
              {" · "}
              <span className="text-emerald-400">{categories.filter((c) => c.is_active).length} aktivních</span>
              {" · "}
              <span className="text-slate-500">{categories.filter((c) => !c.is_active).length} deaktivovaných</span>
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
          >
            + Přidat kategorii
          </button>
        </div>

        {/* Formulář */}
        {showForm && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? "Upravit kategorii" : "Nová kategorie"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Název *
                  </label>
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
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Slug *
                  </label>
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

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Ikona *
                </label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Popis
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Krátký popis kategorie..."
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Hlavní kategorie (parent)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">— Hlavní kategorie (bez parenta) —</option>
                    {categories
                      .filter((c) => c.parent_id === null && c.id !== editingId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.icon} {m.name} {!m.is_active && "(deaktivováno)"}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Pořadí (sort_order)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="např. 10"
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
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

        {/* Seznam kategorií */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Žádné kategorie. Přidejte první kategorii.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Ikona
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Název
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Typ / Parent
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider" title="Počet fachmanů (přes provider_categories)">
                      👷 Fachmani
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider" title="Počet poptávek v této kategorii">
                      📋 Poptávky
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Stav
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(() => {
                    // Seskupit: každá hlavní kategorie hned následovaná svými podkategoriemi.
                    const mains = categories
                      .filter((c) => c.parent_id === null)
                      .sort((a, b) => {
                        const ao = a.sort_order ?? 9999;
                        const bo = b.sort_order ?? 9999;
                        if (ao !== bo) return ao - bo;
                        return a.name.localeCompare(b.name, "cs");
                      });
                    const orphans = categories.filter(
                      (c) => c.parent_id !== null && !categories.find((m) => m.id === c.parent_id)
                    );
                    const rows: ReactElement[] = [];
                    mains.forEach((main) => {
                      const subs = categories
                        .filter((c) => c.parent_id === main.id)
                        .sort((a, b) => {
                          const ao = a.sort_order ?? 9999;
                          const bo = b.sort_order ?? 9999;
                          if (ao !== bo) return ao - bo;
                          return a.name.localeCompare(b.name, "cs");
                        });
                      rows.push(
                        <tr
                          key={main.id}
                          className={`hover:bg-white/5 transition-colors bg-slate-800/40 ${
                            !main.is_active ? "opacity-60" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <CategoryIcon icon={main.icon} size={28} className="text-2xl text-white" />
                          </td>
                          <td className="px-6 py-4 text-white font-semibold">
                            {main.name}
                            {main.sort_order !== null && (
                              <span className="ml-2 text-xs text-slate-500">#{main.sort_order}</span>
                            )}
                            {subs.length > 0 && (
                              <span className="ml-2 text-xs text-slate-400">({subs.length} podkat.)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{main.slug}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="text-cyan-400 font-semibold">HLAVNÍ</span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            {(() => {
                              const direct = providerCounts[main.id] || 0;
                              const fromSubs = subs.reduce((s, x) => s + (providerCounts[x.id] || 0), 0);
                              const total = direct + fromSubs;
                              return (
                                <span className={total > 0 ? "text-white font-medium" : "text-slate-600"}>
                                  {total}
                                  {fromSubs > 0 && <span className="text-slate-500 text-xs"> ({direct}+{fromSubs})</span>}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            {(() => {
                              const direct = requestCounts[main.id] || 0;
                              const fromSubs = subs.reduce((s, x) => s + (requestCounts[x.id] || 0), 0);
                              const total = direct + fromSubs;
                              return (
                                <span className={total > 0 ? "text-white font-medium" : "text-slate-600"}>
                                  {total}
                                  {fromSubs > 0 && <span className="text-slate-500 text-xs"> ({direct}+{fromSubs})</span>}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {main.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                ● Aktivní
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                                ○ Deaktivováno
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <button
                                onClick={() => handleAddSub(main)}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                                title="Přidat podkategorii pod tuto hlavní"
                              >
                                + sub
                              </button>
                              <button
                                onClick={() => handleEdit(main)}
                                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                              >
                                Upravit
                              </button>
                              <button
                                onClick={() => handleToggleActive(main)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  main.is_active
                                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                }`}
                              >
                                {main.is_active ? "Deaktivovat" : "Reaktivovat"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      subs.forEach((sub) => {
                        rows.push(
                          <tr
                            key={sub.id}
                            className={`hover:bg-white/5 transition-colors ${
                              !sub.is_active ? "opacity-60" : ""
                            }`}
                          >
                            <td className="px-6 py-3 pl-12">
                              <CategoryIcon icon={sub.icon} size={20} className="text-lg text-slate-300" />
                            </td>
                            <td className="px-6 py-3 text-slate-200 text-sm">
                              <span className="text-slate-500 mr-2">└─</span>
                              {sub.name}
                              {sub.sort_order !== null && (
                                <span className="ml-2 text-xs text-slate-500">#{sub.sort_order}</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-500">{sub.slug}</td>
                            <td className="px-6 py-3 text-xs text-slate-500">podkategorie</td>
                            <td className="px-6 py-3 text-center text-sm">
                              <span className={(providerCounts[sub.id] || 0) > 0 ? "text-slate-200" : "text-slate-600"}>
                                {providerCounts[sub.id] || 0}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-center text-sm">
                              <span className={(requestCounts[sub.id] || 0) > 0 ? "text-slate-200" : "text-slate-600"}>
                                {requestCounts[sub.id] || 0}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {sub.is_active ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                                  ● Aktivní
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400">
                                  ○
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(sub)}
                                  className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                                >
                                  Upravit
                                </button>
                                <button
                                  onClick={() => handleToggleActive(sub)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    sub.is_active
                                      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  }`}
                                >
                                  {sub.is_active ? "Deaktivovat" : "Reaktivovat"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    });
                    if (orphans.length > 0) {
                      rows.push(
                        <tr key="orphan-header" className="bg-red-900/30">
                          <td colSpan={8} className="px-6 py-2 text-xs text-red-400 font-semibold uppercase">
                            ⚠ Osiřelé podkategorie (parent neexistuje)
                          </td>
                        </tr>
                      );
                      orphans.forEach((o) => {
                        rows.push(
                          <tr key={o.id} className="bg-red-900/10">
                            <td className="px-6 py-3"><CategoryIcon icon={o.icon} size={20} className="text-slate-300" /></td>
                            <td className="px-6 py-3 text-slate-300 text-sm">{o.name}</td>
                            <td className="px-6 py-3 text-xs text-slate-500">{o.slug}</td>
                            <td className="px-6 py-3 text-xs text-red-400">parent_id: {o.parent_id}</td>
                            <td className="px-6 py-3 text-center text-sm text-slate-500">{providerCounts[o.id] || 0}</td>
                            <td className="px-6 py-3 text-center text-sm text-slate-500">{requestCounts[o.id] || 0}</td>
                            <td className="px-6 py-3"></td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={() => handleEdit(o)}
                                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                              >
                                Opravit
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
