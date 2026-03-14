"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  tier: string;
  max_clients: number;
  price_monthly: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM Pipeline",
  portal: "Klientský portál",
  templates: "Emailové šablony",
  scoring: "Klientský scoring",
  automations: "Automatizace",
  meta_ads: "Meta Ads integrace",
  ocr: "OCR rozpoznávání",
  ai_assistant: "AI asistent",
  osvc: "OSVČ modul",
  calendar: "Kalendář",
};

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function PlansPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [tier, setTier] = useState("");
  const [maxClients, setMaxClients] = useState("50");
  const [price, setPrice] = useState("0");
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from("pricing_plans").select("*").order("price_monthly");
      setPlans(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(plan?: Plan) {
    if (plan) {
      setEditPlan(plan);
      setName(plan.name);
      setTier(plan.tier);
      setMaxClients(String(plan.max_clients));
      setPrice(String(plan.price_monthly));
      setFeatures(plan.features || {});
    } else {
      setEditPlan(null);
      setName(""); setTier(""); setMaxClients("50"); setPrice("0");
      setFeatures({});
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name,
      tier,
      max_clients: parseInt(maxClients) || 50,
      price_monthly: parseFloat(price) || 0,
      features,
    };

    if (editPlan) {
      await supabase.from("pricing_plans").update(payload).eq("id", editPlan.id);
    } else {
      await supabase.from("pricing_plans").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success(editPlan ? "Plán aktualizován." : "Plán vytvořen.");
    const { data } = await supabase.from("pricing_plans").select("*").order("price_monthly");
    setPlans(data || []);
  }

  async function handleDelete(id: string) {
    await supabase.from("pricing_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Plán smazán.");
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cenové plány</h1>
        <Button onClick={() => openEdit()}><Plus className="mr-2 h-4 w-4" />Nový plán</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <Badge variant="secondary" className="text-[10px]">{plan.tier}</Badge>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="rounded-md p-1.5 hover:bg-slate-100"><Pencil className="h-4 w-4 text-slate-400" /></button>
                <button onClick={() => handleDelete(plan.id)} className="rounded-md p-1.5 hover:bg-red-50"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
              </div>
            </div>
            <p className="mb-1 text-2xl font-bold text-slate-900">{formatCZK(plan.price_monthly)}<span className="text-sm font-normal text-slate-400">/měs</span></p>
            <p className="mb-4 text-xs text-slate-500">Max {plan.max_clients} klientů</p>
            <div className="space-y-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${plan.features?.[key] ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <span className={plan.features?.[key] ? "text-slate-700" : "text-slate-300"}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editPlan ? "Upravit plán" : "Nový plán"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Název</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Tier (ID)</Label><Input value={tier} onChange={(e) => setTier(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Max klientů</Label><Input type="number" value={maxClients} onChange={(e) => setMaxClients(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Cena/měsíc (Kč)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Funkce</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={features[key] || false} onChange={(e) => setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editPlan ? "Uložit" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
