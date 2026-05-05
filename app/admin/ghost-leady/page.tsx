"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import Link from "next/link";

type GhostLead = {
  id: string;
  ghost_ico: string;
  request_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  message: string | null;
  status: "new" | "contacted" | "claimed" | "rejected" | "closed";
  contacted_at: string | null;
  notes: string | null;
  created_at: string;
  ghost_name?: string;
};

const STATUS_LABELS: Record<GhostLead["status"], string> = {
  new: "Nový",
  contacted: "Kontaktováno",
  claimed: "Převzato",
  rejected: "Odmítnuto",
  closed: "Uzavřeno",
};

const STATUS_COLORS: Record<GhostLead["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  claimed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-gray-100 text-gray-700",
  closed: "bg-gray-200 text-gray-600",
};

export default function AdminGhostLeady() {
  const [leads, setLeads] = useState<GhostLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | GhostLead["status"]>("new");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [filter]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("ghost_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data: leadData } = await q;

    if (!leadData) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const icos = Array.from(new Set(leadData.map((l) => l.ghost_ico)));
    const { data: ghosts } = await supabase
      .from("ghost_subjects")
      .select("ico, name")
      .in("ico", icos);
    const nameMap = new Map((ghosts ?? []).map((g) => [g.ico, g.name]));

    setLeads(leadData.map((l) => ({ ...l, ghost_name: nameMap.get(l.ghost_ico) })));
    setLoading(false);
  }

  async function updateStatus(id: string, status: GhostLead["status"], notes?: string) {
    setSavingId(id);
    const update: Record<string, unknown> = { status };
    if (status === "contacted") update.contacted_at = new Date().toISOString();
    if (notes !== undefined) update.notes = notes;
    await supabase.from("ghost_leads").update(update).eq("id", id);
    await load();
    setSavingId(null);
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ghost leady</h1>
          <p className="text-sm text-gray-600">
            Poptávky pro subjekty z ARES, kteří ještě nemají aktivní profil. Zavolejte fachmanovi a nabídněte mu kšeft.
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "new", "contacted", "claimed", "rejected", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === s ? "bg-cyan-500 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {s === "all" ? "Vše" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Načítám...</div>
        ) : leads.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center text-gray-500">Žádné leady.</div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">
                        {lead.ghost_name ?? `IČO ${lead.ghost_ico}`}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      IČO {lead.ghost_ico} · {new Date(lead.created_at).toLocaleString("cs-CZ")}
                    </p>
                  </div>
                  <Link
                    href={`/fachman/ghost/${lead.ghost_ico}`}
                    className="text-sm text-cyan-600 hover:underline"
                    target="_blank"
                  >
                    Detail subjektu →
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="text-sm">
                    <p className="text-gray-500">Zákazník</p>
                    <p className="text-gray-900">{lead.customer_name ?? "—"}</p>
                    {lead.customer_phone && (
                      <a href={`tel:${lead.customer_phone}`} className="text-cyan-600 hover:underline">
                        {lead.customer_phone}
                      </a>
                    )}
                    {lead.customer_email && (
                      <p className="text-gray-700">{lead.customer_email}</p>
                    )}
                  </div>
                  {lead.request_id && (
                    <div className="text-sm">
                      <p className="text-gray-500">Poptávka</p>
                      <Link
                        href={`/poptavka/${lead.request_id}`}
                        className="text-cyan-600 hover:underline"
                        target="_blank"
                      >
                        Otevřít poptávku →
                      </Link>
                    </div>
                  )}
                </div>

                {lead.message && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                    {lead.message}
                  </div>
                )}

                {lead.notes && (
                  <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-900 mb-4">
                    <strong>Poznámka:</strong> {lead.notes}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {lead.status === "new" && (
                    <button
                      onClick={() => updateStatus(lead.id, "contacted")}
                      disabled={savingId === lead.id}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      Označit jako kontaktováno
                    </button>
                  )}
                  {lead.status !== "rejected" && lead.status !== "closed" && (
                    <button
                      onClick={() => {
                        const note = prompt("Poznámka (proč):") ?? undefined;
                        updateStatus(lead.id, "rejected", note);
                      }}
                      disabled={savingId === lead.id}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                    >
                      Odmítnuto
                    </button>
                  )}
                  {lead.status !== "closed" && (
                    <button
                      onClick={() => updateStatus(lead.id, "closed")}
                      disabled={savingId === lead.id}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Uzavřít
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
