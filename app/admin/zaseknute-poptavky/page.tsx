"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type Stalled = {
  id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location: string | null;
  created_at: string;
  expires_at: string | null;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  category_name: string | null;
  hours_since_created: number;
  offers_count: number;
  matched_fachmani_count: number;
};

export default function ZasekleRequestsPage() {
  const [items, setItems] = useState<Stalled[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "24h" | "48h" | "72h">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("v_admin_stalled_requests")
      .select("*")
      .order("hours_since_created", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Stalled[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRematch = async (requestId: string) => {
    setActioning(requestId);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("admin_rematch_request", {
      p_request_id: requestId,
    });
    if (error) {
      setMessage(`❌ Chyba: ${error.message}`);
    } else {
      const created = typeof data === "number" ? data : 0;
      setMessage(`✅ Rozesláno ${created} nových notifikací`);
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id ?? null,
        action: "stalled_request_rematch",
        target_type: "request",
        target_id: requestId,
        details: { created_notifications: created },
      });
      await load();
    }
    setActioning(null);
  };

  const filtered = items.filter((it) => {
    if (filter === "all") return true;
    const h = it.hours_since_created;
    if (filter === "24h") return h >= 24 && h < 48;
    if (filter === "48h") return h >= 48 && h < 72;
    if (filter === "72h") return h >= 72;
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⏰ Zaseklé poptávky</h1>
            <p className="text-sm text-gray-600 mt-1">
              Aktivní + schválené poptávky bez jediné nabídky starší než 24h. Pomozte zákazníkům — re-match nebo kontakt.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            {(["all", "24h", "48h", "72h"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border ${
                  filter === f ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "Vše" : f === "24h" ? "24-48h" : f === "48h" ? "48-72h" : "72h+"}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Načítám...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            🎉 Žádné zaseklé poptávky v tomto filtru. Všichni mají co dělat.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((it) => {
              const hours = Math.floor(it.hours_since_created);
              const ageColor =
                hours >= 72 ? "bg-red-50 border-red-200 text-red-800" :
                hours >= 48 ? "bg-orange-50 border-orange-200 text-orange-800" :
                "bg-yellow-50 border-yellow-200 text-yellow-800";
              return (
                <div key={it.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/poptavka/${it.id}`}
                          target="_blank"
                          className="font-semibold text-gray-900 hover:text-cyan-700 truncate"
                        >
                          {it.title}
                        </Link>
                        {it.category_name && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {it.category_name}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded border ${ageColor}`}>
                          ⏱ {hours}h
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">{it.description}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        {it.location && <span>📍 {it.location}</span>}
                        {(it.budget_min || it.budget_max) && (
                          <span>💰 {it.budget_min ?? "?"}-{it.budget_max ?? "?"} Kč</span>
                        )}
                        <span>👤 {it.customer_name ?? "—"} ({it.customer_email ?? "—"})</span>
                        <span>🎯 Notifikováno: {it.matched_fachmani_count} fachmani</span>
                        <span>📨 Nabídek: {it.offers_count}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleRematch(it.id)}
                        disabled={actioning === it.id}
                        className="bg-cyan-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {actioning === it.id ? "..." : "🔄 Re-match"}
                      </button>
                      {it.customer_email && (
                        <a
                          href={`mailto:${it.customer_email}?subject=${encodeURIComponent("Vaše poptávka na Fachmani")}&body=${encodeURIComponent("Dobrý den,\n\nchtěli jsme se zeptat, zda jste mezi tím našli vhodného fachmana...")}`}
                          className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-200 text-center"
                        >
                          ✉️ Kontakt
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Celkem zaseklých: <strong>{items.length}</strong>. Filtr zobrazuje: <strong>{filtered.length}</strong>.
        </div>
      </div>
    </AdminLayout>
  );
}
