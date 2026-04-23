"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type PopularRow = { query_norm: string; cnt: number; avg_results: number };
type ZeroRow = { query_norm: string; cnt: number; last_seen: string };
type ClickRow = {
  id: string;
  query: string;
  entity_type: string;
  entity_id: string;
  position: number | null;
  created_at: string;
};
type Synonym = {
  id: number;
  term: string;
  variants: string[];
  note: string | null;
  updated_at: string;
};

export default function AdminVyhledavani() {
  const [popular, setPopular] = useState<PopularRow[]>([]);
  const [zero, setZero] = useState<ZeroRow[]>([]);
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [totalQueries, setTotalQueries] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [synLoading, setSynLoading] = useState(true);
  const [synFilter, setSynFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTerm, setFormTerm] = useState("");
  const [formVariants, setFormVariants] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [synError, setSynError] = useState<string | null>(null);

  useEffect(() => {
    load();
    loadSynonyms();
  }, []);

  const load = async () => {
    setLoading(true);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("search_queries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    setTotalQueries(count || 0);

    const { data: recent } = await supabase
      .from("search_queries")
      .select("query_norm, result_count, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (recent) {
      const byQ = new Map<string, { cnt: number; sum: number }>();
      for (const r of recent) {
        const cur = byQ.get(r.query_norm) || { cnt: 0, sum: 0 };
        cur.cnt += 1;
        cur.sum += r.result_count || 0;
        byQ.set(r.query_norm, cur);
      }
      const popularArr: PopularRow[] = Array.from(byQ.entries())
        .map(([q, v]) => ({ query_norm: q, cnt: v.cnt, avg_results: Math.round((v.sum / v.cnt) * 10) / 10 }))
        .sort((a, b) => b.cnt - a.cnt)
        .slice(0, 30);
      setPopular(popularArr);

      const zeroMap = new Map<string, { cnt: number; last: string }>();
      for (const r of recent) {
        if ((r.result_count || 0) > 0) continue;
        const cur = zeroMap.get(r.query_norm) || { cnt: 0, last: r.created_at };
        cur.cnt += 1;
        if (r.created_at > cur.last) cur.last = r.created_at;
        zeroMap.set(r.query_norm, cur);
      }
      const zeroArr: ZeroRow[] = Array.from(zeroMap.entries())
        .map(([q, v]) => ({ query_norm: q, cnt: v.cnt, last_seen: v.last }))
        .sort((a, b) => b.cnt - a.cnt)
        .slice(0, 30);
      setZero(zeroArr);
    }

    const { data: clicks } = await supabase
      .from("search_clicks")
      .select("id, query, entity_type, entity_id, position, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setRecentClicks((clicks as ClickRow[]) || []);

    setLoading(false);
  };

  const loadSynonyms = async () => {
    setSynLoading(true);
    const { data, error } = await supabase
      .from("search_synonyms")
      .select("id, term, variants, note, updated_at")
      .order("term", { ascending: true });
    if (error) {
      setSynError(error.message);
    } else {
      setSynonyms((data as Synonym[]) || []);
      setSynError(null);
    }
    setSynLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTerm("");
    setFormVariants("");
    setFormNote("");
    setSynError(null);
  };

  const startEdit = (s: Synonym) => {
    setEditingId(s.id);
    setFormTerm(s.term);
    setFormVariants(s.variants.join(", "));
    setFormNote(s.note || "");
    setSynError(null);
  };

  const saveSynonym = async () => {
    const term = formTerm.trim().toLowerCase();
    if (!term) {
      setSynError("Termín je povinný.");
      return;
    }
    const variants = formVariants
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (variants.length === 0) {
      setSynError("Uveď alespoň jednu variantu (oddělené čárkou).");
      return;
    }
    const note = formNote.trim() || null;

    setSaving(true);
    setSynError(null);

    let errMsg: string | null = null;
    if (editingId) {
      const { error } = await supabase
        .from("search_synonyms")
        .update({ term, variants, note, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (error) errMsg = error.message;
    } else {
      const { error } = await supabase
        .from("search_synonyms")
        .insert({ term, variants, note });
      if (error) errMsg = error.message;
    }

    setSaving(false);
    if (errMsg) {
      setSynError(errMsg);
    } else {
      resetForm();
      await loadSynonyms();
    }
  };

  const deleteSynonym = async (id: number, term: string) => {
    if (!confirm(`Smazat synonymum "${term}"?`)) return;
    const { error } = await supabase.from("search_synonyms").delete().eq("id", id);
    if (error) {
      setSynError(error.message);
      return;
    }
    if (editingId === id) resetForm();
    await loadSynonyms();
  };

  const filteredSynonyms = synFilter
    ? synonyms.filter((s) => {
        const q = synFilter.toLowerCase();
        return (
          s.term.toLowerCase().includes(q) ||
          s.variants.some((v) => v.toLowerCase().includes(q)) ||
          (s.note || "").toLowerCase().includes(q)
        );
      })
    : synonyms;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🔎 Vyhledávání — analytika</h1>
          <p className="text-slate-400">Posledních 30 dní · {totalQueries} dotazů celkem</p>
        </div>

        {loading ? (
          <div className="text-slate-400">Načítám...</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-3">🔥 Populární dotazy</h2>
              {popular.length === 0 ? (
                <p className="text-slate-500 text-sm">Žádná data.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {popular.map((p) => (
                    <li key={p.query_norm} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200 truncate">{p.query_norm || "(prázdný)"}</span>
                      <span className="text-slate-400 ml-3 shrink-0">
                        {p.cnt}× · ø {p.avg_results} výsl.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-3">⚠️ Dotazy bez výsledků</h2>
              {zero.length === 0 ? (
                <p className="text-slate-500 text-sm">Všechny dotazy měly výsledky. 🎉</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {zero.map((z) => (
                    <li key={z.query_norm} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200 truncate">{z.query_norm || "(prázdný)"}</span>
                      <span className="text-slate-400 ml-3 shrink-0">
                        {z.cnt}× · {new Date(z.last_seen).toLocaleDateString("cs-CZ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 lg:col-span-2">
              <h2 className="font-bold text-white mb-3">👆 Poslední kliky</h2>
              {recentClicks.length === 0 ? (
                <p className="text-slate-500 text-sm">Zatím žádné kliky.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-left border-b border-white/5">
                        <th className="py-2 pr-4">Dotaz</th>
                        <th className="py-2 pr-4">Typ</th>
                        <th className="py-2 pr-4">Entita</th>
                        <th className="py-2 pr-4">Pozice</th>
                        <th className="py-2 pr-4">Čas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClicks.map((c) => (
                        <tr key={c.id} className="border-b border-white/5">
                          <td className="py-2 pr-4 text-slate-200 truncate max-w-[200px]">{c.query}</td>
                          <td className="py-2 pr-4 text-slate-300">{c.entity_type}</td>
                          <td className="py-2 pr-4 text-slate-400 font-mono text-xs truncate max-w-[200px]">
                            {c.entity_id}
                          </td>
                          <td className="py-2 pr-4 text-slate-300">{c.position ?? "—"}</td>
                          <td className="py-2 pr-4 text-slate-400">
                            {new Date(c.created_at).toLocaleString("cs-CZ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white">📚 Synonyma ({synonyms.length})</h2>
              <p className="text-slate-400 text-sm">
                Termín → varianty, které se rozšíří při vyhledávání. Vše lowercase.
              </p>
            </div>
            <input
              type="text"
              value={synFilter}
              onChange={(e) => setSynFilter(e.target.value)}
              placeholder="Hledat v termínech / variantách..."
              className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 w-72"
            />
          </div>

          <div className="bg-slate-800/60 border border-white/5 rounded-xl p-4 mb-5">
            <h3 className="font-semibold text-white mb-3">
              {editingId ? "✏️ Upravit synonymum" : "➕ Přidat synonymum"}
            </h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Termín</label>
                <input
                  type="text"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  placeholder="elektrikář"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Varianty (oddělené čárkou)
                </label>
                <input
                  type="text"
                  value={formVariants}
                  onChange={(e) => setFormVariants(e.target.value)}
                  placeholder="elektrikar, elektrikare, elektro"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Poznámka</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="(volitelné)"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white"
                />
              </div>
            </div>
            {synError && (
              <p className="mt-3 text-sm text-red-400">⚠️ {synError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={saveSynonym}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold"
              >
                {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Přidat"}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
                >
                  Zrušit
                </button>
              )}
            </div>
          </div>

          {synLoading ? (
            <p className="text-slate-400 text-sm">Načítám synonyma...</p>
          ) : filteredSynonyms.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {synFilter ? "Nic nenalezeno." : "Zatím žádná synonyma."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-left border-b border-white/5">
                    <th className="py-2 pr-4">Termín</th>
                    <th className="py-2 pr-4">Varianty</th>
                    <th className="py-2 pr-4">Poznámka</th>
                    <th className="py-2 pr-4">Upraveno</th>
                    <th className="py-2 pr-4 text-right">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSynonyms.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-white/5 ${
                        editingId === s.id ? "bg-emerald-950/30" : ""
                      }`}
                    >
                      <td className="py-2 pr-4 text-white font-medium">{s.term}</td>
                      <td className="py-2 pr-4 text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {s.variants.map((v, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-800 rounded text-xs"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-slate-400 text-xs max-w-[240px] truncate">
                        {s.note || "—"}
                      </td>
                      <td className="py-2 pr-4 text-slate-500 text-xs">
                        {new Date(s.updated_at).toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(s)}
                          className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-white mr-1"
                        >
                          Upravit
                        </button>
                        <button
                          onClick={() => deleteSynonym(s.id, s.term)}
                          className="px-2 py-1 text-xs bg-red-900/60 hover:bg-red-800 rounded text-red-200"
                        >
                          Smazat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
