"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketModal({ open, onOpenChange }: TicketModalProps) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("question");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { toast.error("Vyplňte předmět."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }

    const { error } = await supabase.from("tickets").insert({
      advisor_id: advisor.id,
      subject: subject.trim(),
      description: description.trim() || null,
      category,
      priority,
    });

    setSaving(false);
    if (error) { toast.error("Nepodařilo se vytvořit tiket."); return; }
    toast.success("Tiket vytvořen, budeme se vám věnovat.");
    setSubject(""); setDescription(""); setCategory("question"); setPriority("medium");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Potřebuji pomoc</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Předmět *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Stručný popis problému" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Popis</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Podrobný popis..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="question">Dotaz</SelectItem>
                  <SelectItem value="technical">Technický problém</SelectItem>
                  <SelectItem value="feature_request">Požadavek na funkci</SelectItem>
                  <SelectItem value="billing">Fakturace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priorita</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Nízká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="high">Vysoká</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Odeslat tiket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
