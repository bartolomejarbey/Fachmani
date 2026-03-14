"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

const actionColors: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700",
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  logout: "bg-slate-100 text-slate-700",
  export: "bg-violet-100 text-violet-700",
  impersonate: "bg-amber-100 text-amber-700",
};

const actionLabels: Record<string, string> = {
  login: "Přihlášení",
  create: "Vytvořeno",
  update: "Upraveno",
  delete: "Smazáno",
  logout: "Odhlášení",
  export: "Export",
  impersonate: "Převzetí",
};

export default function AuditLogPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt("created_at", to.toISOString());
      }
      if (searchQuery.trim()) {
        query = query.or(
          `user_id.ilike.%${searchQuery.trim()}%,entity_id.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, count } = await query;
      setLogs(data || []);
      setTotalCount(count ?? 0);
      setLoading(false);
    },
    [supabase, actionFilter, dateFrom, dateTo, searchQuery]
  );

  useEffect(() => {
    setPage(0);
    fetchLogs(0);
  }, [fetchLogs]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchLogs(newPage);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">Auditní log</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Hledat podle user_id nebo entity_id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Typ akce" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny akce</SelectItem>
              <SelectItem value="login">Přihlášení</SelectItem>
              <SelectItem value="create">Vytvořeno</SelectItem>
              <SelectItem value="update">Upraveno</SelectItem>
              <SelectItem value="delete">Smazáno</SelectItem>
              <SelectItem value="logout">Odhlášení</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="impersonate">Převzetí</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-slate-400 text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-16 text-center shadow-sm">
          <ScrollText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Žádné záznamy nebyly nalezeny</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                <th className="px-5 py-3">Čas</th>
                <th className="px-5 py-3">Uživatel</th>
                <th className="px-5 py-3">Akce</th>
                <th className="px-5 py-3">Entita</th>
                <th className="px-5 py-3">ID entity</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("cs-CZ", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-600">
                    {log.user_id ? log.user_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      className={`text-[10px] ${actionColors[log.action] || "bg-slate-100 text-slate-700"}`}
                    >
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {log.entity_type || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-500">
                    {log.entity_id ? log.entity_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {log.ip_address || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Zobrazeno {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} z {totalCount} záznamů
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => handlePageChange(page - 1)}
            >
              Předchozí
            </Button>
            <span className="text-sm text-slate-600">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => handlePageChange(page + 1)}
            >
              Další
            </Button>
          </div>
        </div>
      )}

      {totalPages <= 1 && logs.length > 0 && (
        <p className="mt-3 text-xs text-slate-500 text-center">
          Celkem {totalCount} záznamů
        </p>
      )}
    </div>
  );
}
