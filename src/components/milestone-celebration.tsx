"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface Milestone {
  id: string;
  title: string;
  description: string;
  type: string;
  achieved_at: string;
}

interface MilestoneCelebrationProps {
  milestone: Milestone | null;
  onClose: () => void;
}

export default function MilestoneCelebration({
  milestone,
  onClose,
}: MilestoneCelebrationProps) {
  const supabase = createClient();

  useEffect(() => {
    if (milestone) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Mark as seen
      supabase
        .from("milestones")
        .update({ seen_by_client: true })
        .eq("id", milestone.id)
        .then();
    }
  }, [milestone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!milestone} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="text-center sm:max-w-md">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Trophy className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {milestone?.title}
          </h2>
          <p className="text-sm text-slate-500">{milestone?.description}</p>
          {milestone?.achieved_at && (
            <p className="text-xs text-slate-500">
              {new Date(milestone.achieved_at).toLocaleDateString("cs-CZ")}
            </p>
          )}
          <Button onClick={onClose} className="mt-2">
            Skvělé!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
