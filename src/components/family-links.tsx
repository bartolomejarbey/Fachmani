"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Unlink } from "lucide-react";
import { toast } from "sonner";

interface FamilyLink {
  id: string;
  primary_client_id: string;
  family_client_id: string;
  relationship: string;
  access_level: string;
  other_name: string;
}

interface ClientOption {
  id: string;
  name: string;
}

const REL_LABELS: Record<string, string> = {
  partner: "Partner",
  spouse: "Manžel/ka",
  parent: "Rodič",
  child: "Dítě",
};

const REL_COLORS: Record<string, string> = {
  partner: "bg-purple-100 text-purple-700",
  spouse: "bg-pink-100 text-pink-700",
  parent: "bg-blue-100 text-blue-700",
  child: "bg-green-100 text-green-700",
};

export function FamilyLinks({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [relationship, setRelationship] = useState("partner");
  const [accessLevel, setAccessLevel] = useState("readonly");

  useEffect(() => {
    fetchLinks();
    fetchClients();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchLinks() {
    const { data: links1 } = await supabase
      .from("family_links")
      .select("id, primary_client_id, family_client_id, relationship, access_level")
      .or(`primary_client_id.eq.${clientId},family_client_id.eq.${clientId}`);

    if (!links1) { setLinks([]); return; }

    const otherIds = links1.map((l) =>
      l.primary_client_id === clientId ? l.family_client_id : l.primary_client_id
    );

    const { data: others } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", otherIds);

    const nameMap: Record<string, string> = {};
    (others || []).forEach((c) => {
      nameMap[c.id] = `${c.first_name} ${c.last_name}`;
    });

    setLinks(
      links1.map((l) => ({
        ...l,
        other_name:
          nameMap[l.primary_client_id === clientId ? l.family_client_id : l.primary_client_id] || "—",
      }))
    );
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .neq("id", clientId)
      .limit(100);

    setClients(
      (data || []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))
    );
  }

  async function handleAdd() {
    if (!selectedClient) return;

    const { data: client } = await supabase
      .from("clients")
      .select("advisor_id")
      .eq("id", clientId)
      .single();

    await supabase.from("family_links").insert({
      advisor_id: client?.advisor_id,
      primary_client_id: clientId,
      family_client_id: selectedClient,
      relationship,
      access_level: accessLevel,
    });

    toast.success("Rodinná vazba přidána.");
    setShowAdd(false);
    setSelectedClient("");
    fetchLinks();
  }

  async function handleRemove(id: string) {
    if (!confirm("Odebrat rodinnou vazbu?")) return;
    await supabase.from("family_links").delete().eq("id", id);
    toast.success("Vazba odebrána.");
    fetchLinks();
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Users className="h-4 w-4" /> Rodina
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="mr-1 h-4 w-4" /> Přidat
        </Button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 rounded-lg bg-slate-50 space-y-3">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte klienta" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REL_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="readonly">Pouze čtení</SelectItem>
                <SelectItem value="full">Plný přístup</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!selectedClient}>
            Propojit
          </Button>
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          Žádné rodinné vazby
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-slate-900">
                  {link.other_name}
                </span>
                <Badge className={`text-[10px] ${REL_COLORS[link.relationship] || "bg-slate-100 text-slate-700"}`}>
                  {REL_LABELS[link.relationship] || link.relationship}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {link.access_level === "full" ? "Plný přístup" : "Čtení"}
                </Badge>
              </div>
              <button
                onClick={() => handleRemove(link.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Unlink className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
