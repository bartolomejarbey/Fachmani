"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Calendar } from "lucide-react";

interface Deadline {
  type: "contract_expiry" | "payment_due" | "fixation_end";
  title: string;
  client_name: string;
  date: string;
  days_remaining: number;
  severity: "green" | "orange" | "red";
}

interface DeadlineWidgetProps {
  advisorId?: string;
  clientId?: string;
  limit?: number;
}

const severityBorder: Record<string, string> = {
  green: "border-l-green-500",
  orange: "border-l-orange-500",
  red: "border-l-red-500",
};

const severityBadge: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Dnes!";
  if (days < 0) return `Pred ${Math.abs(days)} dny`;
  return `Za ${days} dni`;
}

export default function DeadlineWidget({
  advisorId,
  clientId,
  limit = 10,
}: DeadlineWidgetProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeadlines = async () => {
      const params = new URLSearchParams();
      if (advisorId) params.set("advisor_id", advisorId);
      if (clientId) params.set("client_id", clientId);

      try {
        const res = await fetch(`/api/deadlines/check?${params.toString()}`);
        const data = await res.json();
        setDeadlines((data.deadlines || []).slice(0, limit));
      } catch (error) {
        console.error("Chyba pri nacitani terminu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, [advisorId, clientId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Clock className="mr-2 h-4 w-4 animate-spin" />
        Nacitam terminy...
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="mx-auto h-8 w-8 mb-2 text-gray-300" />
        Žádné blížící se termíny.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="h-5 w-5" />
        Blizici se terminy
      </h3>

      <div className="space-y-2">
        {deadlines.map((deadline, i) => (
          <div
            key={`${deadline.type}-${deadline.date}-${i}`}
            className={`rounded-lg border border-l-4 ${severityBorder[deadline.severity]} p-3`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {deadline.severity === "red" && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{deadline.title}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {deadline.client_name}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                <Badge className={severityBadge[deadline.severity]}>
                  {formatDaysRemaining(deadline.days_remaining)}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(deadline.date).toLocaleDateString("cs-CZ")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
