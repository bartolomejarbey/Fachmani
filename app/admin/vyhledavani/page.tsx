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

export default function AdminVyhledavani() {
  const [popular, setPopular] = useState<PopularRow[]>([]);
  const [zero, setZero] = useState<ZeroRow[]>([]);
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [totalQueries, setTotalQueries] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total za 30 dní
    const { count } = await supabase
      .from("search_queries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    setTotalQueries(count || 0);

    // Popular — agregace v klientu ze sample posledních 30 dní (admin RLS povolí select)
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
      </div>
    </AdminLayout>
  );
}
