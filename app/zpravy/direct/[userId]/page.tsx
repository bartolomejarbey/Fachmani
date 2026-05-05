"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
};

type OtherUser = {
  id: string;
  full_name: string;
  role: string | null;
};

// B.F2 — direct chat fachman→fachman bez kontextu poptávky.
export default function DirectChatPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otherUserId = params.userId as string;

  async function loadMessages(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, receiver_id, created_at")
      .is("request_id", null)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(user.id);

      const { data: meProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const myRole = (meProfile as { role: string | null } | null)?.role ?? null;

      const { data: userData } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", otherUserId)
        .single();

      if (!userData) {
        setError("Uživatel nenalezen.");
        setLoading(false);
        return;
      }
      const other = userData as OtherUser;
      setOtherUser(other);

      // Direct chat povolen jen mezi 2 providery (fachmani / providers).
      if (myRole !== "provider" || other.role !== "provider") {
        setError("Direct chat je dostupný jen mezi fachmany.");
        setLoading(false);
        return;
      }

      await loadMessages(user.id);

      await supabase
        .from("messages")
        .update({ is_read: true })
        .is("request_id", null)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id);

      setLoading(false);
    }
    loadData();
  }, [otherUserId, router]);

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel(`direct-${currentUser}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUser}`,
        },
        (payload) => {
          const m = payload.new as Message & { request_id: string | null };
          if (m.request_id !== null) return;
          if (m.sender_id !== otherUserId) return;
          setMessages((prev) => [...prev, m]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || error) return;

    setSending(true);
    const text = newMessage.trim();
    const { error: insErr } = await supabase.from("messages").insert({
      request_id: null,
      sender_id: currentUser,
      receiver_id: otherUserId,
      content: text,
    });
    if (insErr) {
      alert(`Zprávu se nepodařilo odeslat: ${insErr.message}`);
      setSending(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: otherUserId,
      type: "new_message",
      title: "Nová zpráva",
      message: `Máte novou zprávu: "${text.substring(0, 50)}${text.length > 50 ? "…" : ""}"`,
      link: `/zpravy/direct/${currentUser}`,
    });

    setNewMessage("");
    await loadMessages(currentUser);
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link href="/zpravy" className="text-blue-600 hover:underline text-sm">
              ← Zpět na zprávy
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-2xl p-6 text-center max-w-md">
            <div className="text-3xl mb-2">🚫</div>
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/zpravy" className="text-blue-600 hover:underline text-sm">
              ← Zpět na zprávy
            </Link>
            <h1 className="font-semibold">{otherUser?.full_name}</h1>
            <p className="text-xs text-gray-500">Direct chat (bez poptávky)</p>
          </div>
          <Link
            href={`/fachman/${otherUserId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            Profil fachmana
          </Link>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Zatím žádné zprávy. Napište první!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    msg.sender_id === currentUser
                      ? "bg-blue-600 text-white"
                      : "bg-white shadow"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_id === currentUser ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("cs-CZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište zprávu…"
            maxLength={2000}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "…" : "Odeslat"}
          </button>
        </form>
      </div>
    </div>
  );
}
