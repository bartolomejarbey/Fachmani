"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LifeEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const eventTypes: Record<string, string> = {
  marriage: "Svatba",
  baby: "Narození dítěte",
  divorce: "Rozvod",
  new_job: "Nové zaměstnání",
  job_loss: "Ztráta zaměstnání",
  buy_property: "Koupě nemovitosti",
  sell_property: "Prodej nemovitosti",
  retirement: "Odchod do důchodu",
  other: "Jiná změna",
};

export default function LifeEventModal({
  open,
  onOpenChange,
  onSubmitted,
}: LifeEventModalProps) {
  const supabase = createClient();
  const [eventType, setEventType] = useState("marriage");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nejste přihlášeni.");
        setSaving(false);
        return;
      }

      const { data: client } = await supabase
        .from("clients")
        .select("id, advisor_id")
        .eq("user_id", user.id)
        .single();

      if (!client) {
        toast.error("Klient nenalezen.");
        setSaving(false);
        return;
      }

      await supabase.from("life_events").insert({
        client_id: client.id,
        advisor_id: client.advisor_id,
        event_type: eventType,
        event_date: eventDate,
        description: description || null,
      });

      toast.success("Životní událost nahlášena. Váš poradce bude informován.");
      setEventType("marriage");
      setEventDate("");
      setDescription("");
      onOpenChange(false);
      onSubmitted?.();
    } catch {
      toast.error("Nepodařilo se uložit událost.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nahlásit životní událost</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Typ události *</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Datum *</Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Popis</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Volitelný popis události..."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Odeslat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
