"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CreditCard,
  FileText,
  Mail,
  AlertTriangle,
  Info,
  CheckCheck,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  payment_reminder: { icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
  new_document: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  message: { icon: Mail, color: "text-violet-600", bg: "bg-violet-50" },
  saving_alert: { icon: AlertTriangle, color: "text-green-600", bg: "bg-green-50" },
  info: { icon: Info, color: "text-slate-600", bg: "bg-slate-50" },
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }
      setClientId(client.id);

      const { data } = await supabase.from("client_notifications").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function markAsRead(id: string) {
    await supabase.from("client_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await supabase.from("client_notifications").update({ is_read: true }).eq("client_id", clientId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Oznámení</h1>
          {unreadCount > 0 && <p className="mt-0.5 text-sm text-slate-500">{unreadCount} nepřečtených</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />Označit vše jako přečtené
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Bell className="mb-4 h-12 w-12 text-slate-200" />
          <p className="text-lg font-medium text-slate-400">Žádná oznámení</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`flex items-start gap-4 rounded-xl border p-4 shadow-sm transition-colors cursor-pointer ${
                  n.is_read ? "bg-white" : "bg-blue-50/50 border-blue-100"
                } hover:bg-slate-50`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-medium ${n.is_read ? "text-slate-700" : "text-slate-900"}`}>{n.title}</h3>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString("cs-CZ")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
