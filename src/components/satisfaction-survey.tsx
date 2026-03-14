"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SatisfactionSurveyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType?: string;
}

export default function SatisfactionSurvey({
  open,
  onOpenChange,
  triggerType,
}: SatisfactionSurveyProps) {
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Vyberte prosím hodnocení.");
      return;
    }
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

      await supabase.from("satisfaction_surveys").insert({
        client_id: client.id,
        advisor_id: client.advisor_id,
        rating,
        comment: comment || null,
        trigger_type: triggerType || null,
      });

      toast.success("Děkujeme za vaše hodnocení!");
      setRating(0);
      setComment("");
      onOpenChange(false);
    } catch {
      toast.error("Nepodařilo se odeslat hodnocení.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jak jste spokojeni?</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Vaše hodnocení *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Komentář</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Napište nám svůj názor..."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Odeslat hodnocení
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
