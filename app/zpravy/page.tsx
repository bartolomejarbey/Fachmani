"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Conversation = {
  request_id: string;
  other_user_id: string;
  other_user_name: string;
  request_title: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export default function Zpravy() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversations() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      setCurrentUser(user.id);

      // Načteme všechny zprávy uživatele
      const { data: messages } = await supabase
        .from("messages")
        .select(`
          id,
          request_id,
          sender_id,
          receiver_id,
          content,
          is_read,
          created_at,
          requests(title),
          sender:profiles!messages_sender_id_fkey(full_name),
          receiver:profiles!messages_receiver_id_fkey(full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messages) {
        // Seskupíme zprávy podle request_id a druhého uživatele
        const convMap = new Map<string, Conversation>();
        
        messages.forEach((msg: any) => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const otherUserName = msg.sender_id === user.id 
            ? msg.receiver?.full_name 
            : msg.sender?.full_name;
          const key = `${msg.request_id}-${otherUserId}`;
          
          if (!convMap.has(key)) {
            convMap.set(key, {
              request_id: msg.request_id,
              other_user_id: otherUserId,
              other_user_name: otherUserName || "Neznámý",
              request_title: msg.requests?.title || "Poptávka",
              last_message: msg.content,
              last_message_at: msg.created_at,
              unread_count: 0,
            });
          }
          
          // Počítáme nepřečtené
          if (!msg.is_read && msg.receiver_id === user.id) {
            const conv = convMap.get(key)!;
            conv.unread_count++;
          }
        });

        setConversations(Array.from(convMap.values()));
      }

      setLoading(false);
    }

    loadConversations();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Fachmani
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Zpět na dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Zprávy</h1>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Zatím nemáte žádné zprávy.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {conversations.map((conv) => (
              <Link
                key={`${conv.request_id}-${conv.other_user_id}`}
                href={`/zpravy/${conv.request_id}/${conv.other_user_id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{conv.other_user_name}</span>
                      {conv.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{conv.request_title}</p>
                    <p className="text-gray-600 mt-1 line-clamp-1">{conv.last_message}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(conv.last_message_at).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}