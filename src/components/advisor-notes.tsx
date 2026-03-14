"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickyNote, Pin, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  category: "personal" | "business" | "important";
  is_pinned: boolean;
  created_at: string;
  client_id?: string;
  deal_id?: string;
}

interface AdvisorNotesProps {
  clientId?: string;
  dealId?: string;
}

const categoryColors: Record<string, string> = {
  personal: "bg-purple-100 text-purple-700",
  business: "bg-blue-100 text-blue-700",
  important: "bg-red-100 text-red-700",
};

const categoryLabels: Record<string, string> = {
  personal: "Osobní",
  business: "Obchodní",
  important: "Důležité",
};

export default function AdvisorNotes({ clientId, dealId }: AdvisorNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"personal" | "business" | "important">("business");
  const [newPinned, setNewPinned] = useState(false);

  const fetchNotes = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("advisor_notes")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);
    if (dealId) query = query.eq("deal_id", dealId);

    const { data, error } = await query;
    if (error) {
      console.error("Chyba při načítání poznámek:", error);
    } else {
      setNotes((data || []) as Note[]);
    }
    setLoading(false);
  }, [clientId, dealId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    if (!newContent.trim()) {
      toast.error("Obsah poznámky je povinný");
      return;
    }

    const supabase = createClient();
    const insertData: Record<string, unknown> = {
      content: newContent.trim(),
      category: newCategory,
      is_pinned: newPinned,
    };
    if (clientId) insertData.client_id = clientId;
    if (dealId) insertData.deal_id = dealId;

    const { error } = await supabase.from("advisor_notes").insert(insertData);

    if (error) {
      toast.error("Chyba při ukládání poznámky");
      return;
    }

    toast.success("Poznámka přidána");
    setNewContent("");
    setNewCategory("business");
    setNewPinned(false);
    setShowForm(false);
    fetchNotes();
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("advisor_notes")
      .update({ content: editContent.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Chyba při úpravě poznámky");
      return;
    }

    toast.success("Poznámka upravena");
    setEditingId(null);
    setEditContent("");
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Opravdu chcete smazat tuto poznámku?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("advisor_notes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Chyba při mazání poznámky");
      return;
    }

    toast.success("Poznámka smazána");
    fetchNotes();
  };

  const togglePin = async (note: Note) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("advisor_notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id);

    if (error) {
      toast.error("Chyba při změně připnutí");
      return;
    }

    fetchNotes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <StickyNote className="mr-2 h-4 w-4" />
        Načítám poznámky...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <StickyNote className="h-5 w-5" />
          Poznámky
        </h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <>
              <X className="mr-1 h-4 w-4" /> Zrušit
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" /> Přidat poznámku
            </>
          )}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-gray-50">
          <div>
            <Label>Obsah poznámky</Label>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Napište poznámku..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label>Kategorie</Label>
              <Select
                value={newCategory}
                onValueChange={(val) =>
                  setNewCategory(val as "personal" | "business" | "important")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Osobní</SelectItem>
                  <SelectItem value="business">Obchodní</SelectItem>
                  <SelectItem value="important">Důležité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setNewPinned(!newPinned)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${
                  newPinned
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Pin className="h-3 w-3" />
                {newPinned ? "Připnuto" : "Připnout"}
              </button>
            </div>
          </div>
          <Button onClick={handleAdd} size="sm">
            Uložit poznámku
          </Button>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Žádné poznámky. Přidejte první poznámku.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-3 ${
                note.is_pinned ? "bg-yellow-50 border-yellow-200" : "bg-white"
              }`}
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(note.id)}
                    >
                      <Check className="mr-1 h-3 w-3" /> Uložit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {note.is_pinned && (
                          <Pin className="h-3 w-3 text-yellow-600" />
                        )}
                        <Badge className={categoryColors[note.category]}>
                          {categoryLabels[note.category]}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleDateString("cs-CZ")}{" "}
                          {new Date(note.created_at).toLocaleTimeString("cs-CZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => togglePin(note)}
                        className={`rounded p-1 hover:bg-gray-100 ${
                          note.is_pinned ? "text-yellow-600" : "text-gray-400"
                        }`}
                        title={note.is_pinned ? "Odepnout" : "Připnout"}
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Upravit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Smazat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
