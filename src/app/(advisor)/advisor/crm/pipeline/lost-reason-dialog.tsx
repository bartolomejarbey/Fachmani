"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function LostReasonDialog({ open, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason);
    setReason("");
  }

  function handleCancel() {
    setReason("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-center">
            Označit deal jako prohra
          </DialogTitle>
          <DialogDescription className="text-center">
            Uveďte důvod ztráty dealu pro budoucí analýzu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="lost-reason">Důvod ztráty</Label>
          <Textarea
            id="lost-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Např. klient zvolil konkurenci, nedostatečný rozpočet..."
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Zrušit
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Označit jako prohra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
