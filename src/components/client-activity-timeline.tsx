"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ActivityEntry {
  id: string;
  action: string;
  page: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ClientActivityTimelineProps {
  clientId: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "právě teď";
  if (diffMin < 60) return `před ${diffMin} minutami`;
  if (diffHours < 24) return `před ${diffHours} hodinami`;
  if (diffDays === 1) return "včera";
  if (diffDays < 7) return `před ${diffDays} dny`;
  if (diffDays < 30) return `před ${Math.floor(diffDays / 7)} týdny`;
  return `před ${Math.floor(diffDays / 30)} měsíci`;
}

const actionColors: Record<string, string> = {
  page_view: "bg-gray-100 text-gray-700",
  document_upload: "bg-blue-100 text-blue-700",
  contract_added: "bg-green-100 text-green-700",
  calculator_used: "bg-purple-100 text-purple-700",
  login: "bg-slate-100 text-slate-700",
};

function getActionColor(action: string): string {
  return actionColors[action] || "bg-gray-100 text-gray-700";
}

export default function ClientActivityTimeline({
  clientId,
}: ClientActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lastActive: "",
    totalThisMonth: 0,
    mostVisitedPage: "",
  });

  useEffect(() => {
    const fetchActivities = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("client_activity_log")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Chyba při načítání aktivit:", error);
        setLoading(false);
        return;
      }

      const entries = (data || []) as ActivityEntry[];
      setActivities(entries);

      // Calculate stats
      if (entries.length > 0) {
        const lastActive = formatRelativeTime(entries[0].created_at);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalThisMonth = entries.filter(
          (e) => new Date(e.created_at) >= startOfMonth
        ).length;

        const pageCounts: Record<string, number> = {};
        entries.forEach((e) => {
          pageCounts[e.page] = (pageCounts[e.page] || 0) + 1;
        });
        const mostVisitedPage = Object.entries(pageCounts).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || "-";

        setStats({ lastActive, totalThisMonth, mostVisitedPage });
      }

      setLoading(false);
    };

    fetchActivities();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Clock className="mr-2 h-4 w-4 animate-spin" />
        Načítám aktivitu...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="h-4 w-4" />
            Poslední aktivita
          </div>
          <div className="font-medium">{stats.lastActive || "-"}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Activity className="h-4 w-4" />
            Tento měsíc
          </div>
          <div className="font-medium">{stats.totalThisMonth} aktivit</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Eye className="h-4 w-4" />
            Nejnavštěvovanější
          </div>
          <div className="font-medium">{stats.mostVisitedPage || "-"}</div>
        </div>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Žádná zaznamenaná aktivita.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-lg border p-3"
            >
              <div className="text-sm text-gray-500 w-40 shrink-0">
                {formatRelativeTime(entry.created_at)}
              </div>
              <Badge className={getActionColor(entry.action)}>
                {entry.action}
              </Badge>
              <div className="text-sm text-gray-700">{entry.page}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
