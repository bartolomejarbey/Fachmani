"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Mail,
  UserX,
  CreditCard,
  Download,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";

/* ───── Typy ───── */

interface Advisor {
  id: string;
  company_name: string;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
  client_count: number;
  email: string | null;
  logo_url: string | null;
  brand_color: string | null;
  has_clients: boolean;
  has_deals: boolean;
  has_client_with_user: boolean;
  onboarding_score: number;
}

const ONBOARDING_TOTAL = 8;
const DEFAULT_BRAND_COLOR = "#3b82f6";

function calculateOnboarding(advisor: {
  logo_url: string | null;
  brand_color: string | null;
  has_clients: boolean;
  has_deals: boolean;
  has_client_with_user: boolean;
  company_name: string;
  email: string | null;
  is_active: boolean;
}): number {
  let score = 0;
  if (advisor.logo_url) score++;
  if (advisor.brand_color && advisor.brand_color !== DEFAULT_BRAND_COLOR) score++;
  if (advisor.has_clients) score++;
  if (advisor.has_deals) score++;
  if (advisor.has_client_with_user) score++;
  if (advisor.company_name && advisor.company_name.length > 0) score++;
  if (advisor.email) score++;
  if (advisor.is_active) score++;
  return score;
}

/* ───── Komponenta ───── */

export default function AdvisorsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  // Výběr
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialogy
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState("starter");

  useEffect(() => {
    async function fetchData() {
      const [advisorsRes, clientsRes, dealsRes, clientUsersRes] =
        await Promise.all([
          supabase
            .from("advisors")
            .select(
              "id, company_name, subscription_tier, is_active, created_at, email, logo_url, brand_color"
            )
            .order("created_at", { ascending: false }),
          supabase.from("clients").select("id, advisor_id"),
          supabase.from("deals").select("id, advisor_id"),
          supabase.from("clients").select("advisor_id, user_id"),
        ]);

      const clientCounts: Record<string, number> = {};
      const hasClients: Record<string, boolean> = {};
      (clientsRes.data || []).forEach((c) => {
        clientCounts[c.advisor_id] =
          (clientCounts[c.advisor_id] || 0) + 1;
        hasClients[c.advisor_id] = true;
      });

      const hasDeals: Record<string, boolean> = {};
      (dealsRes.data || []).forEach((d) => {
        hasDeals[d.advisor_id] = true;
      });

      const hasClientWithUser: Record<string, boolean> = {};
      (clientUsersRes.data || []).forEach((c) => {
        if (c.user_id) hasClientWithUser[c.advisor_id] = true;
      });

      setAdvisors(
        (advisorsRes.data || []).map((a) => {
          const enriched = {
            ...a,
            client_count: clientCounts[a.id] || 0,
            has_clients: !!hasClients[a.id],
            has_deals: !!hasDeals[a.id],
            has_client_with_user: !!hasClientWithUser[a.id],
            onboarding_score: 0,
          };
          enriched.onboarding_score = calculateOnboarding(enriched);
          return enriched;
        })
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return advisors.filter((a) => {
      if (
        search &&
        !a.company_name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (tierFilter !== "all" && a.subscription_tier !== tierFilter)
        return false;
      return true;
    });
  }, [advisors, search, tierFilter]);

  /* ───── Výběr ───── */

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((a) => selectedIds.includes(a.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filtered.some((a) => a.id === id))
      );
    } else {
      const newIds = new Set([...selectedIds, ...filtered.map((a) => a.id)]);
      setSelectedIds(Array.from(newIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  /* ───── Hromadné akce ───── */

  async function handleSendEmail() {
    // Mock odeslání emailu
    const selected = advisors.filter((a) => selectedIds.includes(a.id));
    const emails = selected.map((a) => a.email).filter(Boolean);
    toast.success(
      `Email odeslán ${emails.length} poradcům. (mock)`
    );
    setEmailDialogOpen(false);
    setEmailText("");
  }

  async function handleDeactivate() {
    for (const id of selectedIds) {
      await supabase
        .from("advisors")
        .update({ is_active: false })
        .eq("id", id);
    }
    setAdvisors((prev) =>
      prev.map((a) =>
        selectedIds.includes(a.id) ? { ...a, is_active: false } : a
      )
    );
    toast.success(`Deaktivováno ${selectedIds.length} poradců.`);
    setDeactivateDialogOpen(false);
    setSelectedIds([]);
  }

  async function handleChangePlan() {
    for (const id of selectedIds) {
      await supabase
        .from("advisors")
        .update({ subscription_tier: newPlan })
        .eq("id", id);
    }
    setAdvisors((prev) =>
      prev.map((a) =>
        selectedIds.includes(a.id)
          ? { ...a, subscription_tier: newPlan }
          : a
      )
    );
    toast.success(
      `Plán změněn na "${newPlan}" pro ${selectedIds.length} poradců.`
    );
    setPlanDialogOpen(false);
    setSelectedIds([]);
  }

  function handleExportCSV() {
    const selected = advisors.filter((a) => selectedIds.includes(a.id));
    const headers = [
      "Firma",
      "Email",
      "Tarif",
      "Klientů",
      "Stav",
      "Onboarding",
      "Registrace",
    ];
    const rows = selected.map((a) => [
      a.company_name,
      a.email || "",
      a.subscription_tier,
      a.client_count.toString(),
      a.is_active ? "Aktivní" : "Neaktivní",
      `${a.onboarding_score}/${ONBOARDING_TOTAL}`,
      new Date(a.created_at).toLocaleDateString("cs-CZ"),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "poradci_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportováno ${selected.length} poradců.`);
  }

  /* ───── Onboarding progress bar ───── */

  function OnboardingBar({ score }: { score: number }) {
    const pct = Math.round((score / ONBOARDING_TOTAL) * 100);
    const color =
      pct >= 75
        ? "bg-emerald-500"
        : pct >= 50
          ? "bg-amber-500"
          : "bg-red-500";
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 rounded-full bg-slate-200">
          <div
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {score}/{ONBOARDING_TOTAL}
        </span>
      </div>
    );
  }

  /* ───── Loading ───── */

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  /* ───── Render ───── */

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Správa poradců
      </h1>

      {/* Akční lišta pro výběr */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 mr-2">
            Vybráno: {selectedIds.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="mr-1 h-3.5 w-3.5" />
            Poslat email
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setDeactivateDialogOpen(true)}
          >
            <UserX className="mr-1 h-3.5 w-3.5" />
            Deaktivovat
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPlanDialogOpen(true)}
          >
            <CreditCard className="mr-1 h-3.5 w-3.5" />
            Změnit plán
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Filtry */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Hledat poradce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "starter", "professional", "enterprise"].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                tierFilter === t
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "all"
                ? "Vše"
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabulka */}
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3">Firma</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Klientů</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Onboarding</th>
              <th className="px-4 py-3">Registrace</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className={`border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 ${
                  selectedIds.includes(a.id) ? "bg-blue-50/50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td
                  className="px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                  onClick={() =>
                    router.push(`/superadmin/poradci/${a.id}`)
                  }
                >
                  {a.company_name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {a.email || "---"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {a.subscription_tier}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {a.client_count}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`text-[10px] ${
                      a.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {a.is_active ? "Aktivní" : "Neaktivní"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <OnboardingBar score={a.onboarding_score} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(a.created_at).toLocaleDateString("cs-CZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog: Poslat email */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poslat email vybraným poradcům</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Email bude odeslán {selectedIds.length} poradcům.
          </p>
          <Textarea
            placeholder="Text emailu..."
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={6}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Zrušit
            </Button>
            <Button onClick={handleSendEmail} disabled={!emailText.trim()}>
              <Mail className="mr-2 h-4 w-4" />
              Odeslat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Deaktivovat */}
      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrzení deaktivace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Opravdu chcete deaktivovat{" "}
            <span className="font-bold">{selectedIds.length}</span> poradců?
            Tato akce nastaví jejich účet jako neaktivní.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
            >
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              <UserX className="mr-2 h-4 w-4" />
              Deaktivovat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Změnit plán */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Změnit plán pro vybrané poradce</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-2">
            Nový plán bude nastaven pro {selectedIds.length} poradců.
          </p>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">
                Starter (990 Kč/měsíc)
              </SelectItem>
              <SelectItem value="professional">
                Professional (1 990 Kč/měsíc)
              </SelectItem>
              <SelectItem value="enterprise">
                Enterprise (4 990 Kč/měsíc)
              </SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
            >
              Zrušit
            </Button>
            <Button onClick={handleChangePlan}>
              <CreditCard className="mr-2 h-4 w-4" />
              Změnit plán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
