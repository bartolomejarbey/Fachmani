"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Duplicate {
  type: string;
  contracts: { id: string; title: string }[];
  message: string;
}

export function DuplicateWarning({ clientId }: { clientId: string }) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/client/check-duplicates?client_id=${clientId}`)
      .then((r) => r.json())
      .then((data) => setDuplicates(data.duplicates || []))
      .catch(() => {});
  }, [clientId]);

  const visible = duplicates.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {duplicates.map((dup, i) =>
        dismissed.has(i) ? null : (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">{dup.message}</p>
              <p className="text-xs text-amber-600 mt-1">
                Smlouvy: {dup.contracts.map((c) => c.title).join(", ")}
              </p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(i))}
              className="text-amber-400 hover:text-amber-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      )}
    </div>
  );
}
