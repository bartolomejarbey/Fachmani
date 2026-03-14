"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Ticket,
  Clock,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

interface TicketRow {
  id: string;
  advisor_id: string;
  advisor_name: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting: "bg-violet-100 text-violet-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-700",
};

const statusLabels: Record<string, string> = {
  open: "Otevřený",
  in_progress: "Řeší se",
  waiting: "Čeká",
  resolved: "Vyřešeno",
  closed: "Uzavřeno",
};

const categoryLabels: Record<string, string> = {
  bug: "Chyba",
  feature: "Funkce",
  billing: "Fakturace",
  support: "Podpora",
  other: "Ostatní",
};

export default function TicketsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [ticketsRes, advisorsRes, superadminsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, advisor_id, subject, category, priority, status, assigned_to, created_at, resolved_at")
          .order("created_at", { ascending: false }),
        supabase.from("advisors").select("id, company_name"),
        supabase.from("superadmins").select("id, name"),
      ]);

      const advisorMap: Record<string, string> = {};
      (advisorsRes.data || []).forEach((a) => {
        advisorMap[a.id] = a.company_name;
      });

      const mapped: TicketRow[] = (ticketsRes.data || []).map((t) => ({
        ...t,
        advisor_name: advisorMap[t.advisor_id] || "Neznámý",
      }));

      setTickets(mapped);
      setAssignees(
        (superadminsRes.data || []).map((s) => ({ id: s.id, name: s.name }))
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting").length;
  const todayCount = tickets.filter((t) => t.created_at >= todayStart).length;

  const resolved = tickets.filter((t) => t.resolved_at);
  const avgResolution = resolved.length > 0
    ? Math.round(
        resolved.reduce((sum, t) => {
          const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0) / resolved.length
      )
    : 0;

  const filtered = tickets.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.subject.toLowerCase().includes(q) &&
        !t.advisor_name.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (assignedFilter !== "all" && t.assigned_to !== assignedFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold gradient-text">Správa tiketů</h1>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={AlertCircle}
          label="Otevřených tiketů"
          value={String(openCount)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          icon={Clock}
          label="Prům. doba řešení"
          value={avgResolution > 0 ? `${avgResolution} h` : "—"}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <KpiCard
          icon={CalendarDays}
          label="Tiketů dnes"
          value={String(todayCount)}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Hledat tikety (předmět, poradce, ID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="open">Otevřený</SelectItem>
            <SelectItem value="in_progress">Řeší se</SelectItem>
            <SelectItem value="waiting">Čeká</SelectItem>
            <SelectItem value="resolved">Vyřešeno</SelectItem>
            <SelectItem value="closed">Uzavřeno</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priorita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="low">Nízká</SelectItem>
            <SelectItem value="medium">Střední</SelectItem>
            <SelectItem value="high">Vysoká</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="bug">Chyba</SelectItem>
            <SelectItem value="feature">Funkce</SelectItem>
            <SelectItem value="billing">Fakturace</SelectItem>
            <SelectItem value="support">Podpora</SelectItem>
            <SelectItem value="other">Ostatní</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Přiřazeno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Poradce</th>
              <th className="px-4 py-3">Předmět</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3">Priorita</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Přiřazeno</th>
              <th className="px-4 py-3">Vytvořeno</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  <Ticket className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Žádné tikety nebyly nalezeny
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const assignee = assignees.find((a) => a.id === t.assigned_to);
                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/superadmin/tikety/${t.id}`)}
                    className="cursor-pointer border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">
                      {t.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {t.advisor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[250px] truncate">
                      {t.subject}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[t.category] || t.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColors[t.priority] || "bg-slate-100 text-slate-700"}`}
                      >
                        {t.priority === "low" ? "Nízká" : t.priority === "medium" ? "Střední" : "Vysoká"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[t.status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {statusLabels[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {assignee?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleDateString("cs-CZ")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Zobrazeno {filtered.length} z {tickets.length} tiketů
      </p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
