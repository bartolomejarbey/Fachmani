"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  User,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TicketDetail {
  id: string;
  advisor_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface Advisor {
  id: string;
  company_name: string;
  email: string | null;
}

interface Superadmin {
  id: string;
  name: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting: "bg-violet-100 text-violet-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-700",
};

const statusLabels: Record<string, string> = {
  open: "Otevřený",
  in_progress: "Řeší se",
  waiting: "Čeká",
  resolved: "Vyřešeno",
  closed: "Uzavřeno",
};

const priorityLabels: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
};

const categoryLabels: Record<string, string> = {
  bug: "Chyba",
  feature: "Funkce",
  billing: "Fakturace",
  support: "Podpora",
  other: "Ostatní",
};

export default function TicketDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [ticketRes, messagesRes, superadminsRes] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", ticketId).single(),
        supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
        supabase.from("superadmins").select("id, name"),
      ]);

      if (ticketRes.data) {
        setTicket(ticketRes.data);
        const advisorRes = await supabase
          .from("advisors")
          .select("id, company_name, email")
          .eq("id", ticketRes.data.advisor_id)
          .single();
        setAdvisor(advisorRes.data || null);
      }

      setMessages(messagesRes.data || []);
      setSuperadmins(superadminsRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !ticket) return;
    setSending(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || "superadmin";

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "superadmin",
      sender_id: userId,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Nepodařilo se odeslat zprávu");
    } else {
      toast.success("Zpráva odeslána");
      setNewMessage("");
      const { data } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    }
    setSending(false);
  }

  async function handleUpdateTicket(field: string, value: string) {
    if (!ticket) return;
    setUpdating(true);

    const updateData: Record<string, string> = { [field]: value };
    if (field === "status" && value === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tickets")
      .update(updateData)
      .eq("id", ticket.id);

    if (error) {
      toast.error("Nepodařilo se aktualizovat tiket");
    } else {
      setTicket({ ...ticket, ...updateData });
      toast.success("Tiket aktualizován");
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-3">
            <Skeleton className="h-96 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Tiket nebyl nalezen</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/superadmin/tikety")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět na tikety
        </Button>
      </div>
    );
  }

  const assignedName = superadmins.find((s) => s.id === ticket.assigned_to)?.name;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 text-slate-500"
          onClick={() => router.push("/superadmin/tikety")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Zpět na tikety
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 flex-1">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[ticket.status] || "bg-slate-100 text-slate-700"}`}
            >
              {statusLabels[ticket.status] || ticket.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityColors[ticket.priority] || "bg-slate-100 text-slate-700"}`}
            >
              {priorityLabels[ticket.priority] || ticket.priority}
            </span>
            <Badge variant="outline" className="text-xs">
              {categoryLabels[ticket.category] || ticket.category}
            </Badge>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Poradce: <span className="font-medium text-slate-700">{advisor?.company_name || "Neznámý"}</span>
          {advisor?.email && <span className="ml-2 text-slate-400">({advisor.email})</span>}
          <span className="ml-3 text-slate-400">
            Vytvořeno: {new Date(ticket.created_at).toLocaleString("cs-CZ")}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Konverzace</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[500px] min-h-[300px]">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12">
                Zatím žádné zprávy
              </p>
            ) : (
              messages.map((msg) => {
                const isSuperadmin = msg.sender_type === "superadmin";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSuperadmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isSuperadmin
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-slate-100 text-slate-900 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isSuperadmin ? (
                          <ShieldCheck className="h-3 w-3 opacity-70" />
                        ) : (
                          <User className="h-3 w-3 opacity-70" />
                        )}
                        <span
                          className={`text-[10px] font-medium ${
                            isSuperadmin ? "text-blue-200" : "text-slate-400"
                          }`}
                        >
                          {isSuperadmin ? "Podpora" : advisor?.company_name || "Poradce"}
                          {" "}
                          {new Date(msg.created_at).toLocaleString("cs-CZ", {
                            day: "numeric",
                            month: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <Input
                placeholder="Napište odpověď..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                size="sm"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-slate-700">Nastavení tiketu</h3>

            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Stav</Label>
              <Select
                value={ticket.status}
                onValueChange={(v) => handleUpdateTicket("status", v)}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Otevřený</SelectItem>
                  <SelectItem value="in_progress">Řeší se</SelectItem>
                  <SelectItem value="waiting">Čeká</SelectItem>
                  <SelectItem value="resolved">Vyřešeno</SelectItem>
                  <SelectItem value="closed">Uzavřeno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Priorita</Label>
              <Select
                value={ticket.priority}
                onValueChange={(v) => handleUpdateTicket("priority", v)}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Nízká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="high">Vysoká</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Přiřazeno</Label>
              <Select
                value={ticket.assigned_to || "unassigned"}
                onValueChange={(v) =>
                  handleUpdateTicket("assigned_to", v === "unassigned" ? "" : v)
                }
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nepřiřazeno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Nepřiřazeno</SelectItem>
                  {superadmins.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Informace o poradci</h3>
            <div className="space-y-1.5">
              <p className="text-sm text-slate-700 font-medium">{advisor?.company_name || "—"}</p>
              <p className="text-xs text-slate-500">{advisor?.email || "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Detail</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">ID tiketu</span>
              <span className="font-mono text-slate-600">{ticket.id.slice(0, 12)}...</span>
              <span className="text-slate-400">Kategorie</span>
              <span className="text-slate-600">{categoryLabels[ticket.category] || ticket.category}</span>
              <span className="text-slate-400">Vytvořeno</span>
              <span className="text-slate-600">{new Date(ticket.created_at).toLocaleString("cs-CZ")}</span>
              <span className="text-slate-400">Přiřazeno</span>
              <span className="text-slate-600">{assignedName || "Nepřiřazeno"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
