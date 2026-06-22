"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Avatar from "@/app/components/Avatar";
import ChatPanel from "./ChatPanel";
import type { ChatHeadConversation, ChatMessage } from "./types";

// Max počet souběžných chat heads — stejné jako Messenger desktop default.
const MAX_HEADS = 5;
const HISTORY_LIMIT = 30;

export default function ChatHeads() {
  const pathname = usePathname();
  const [me, setMe] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatHeadConversation[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Refs pro async closures — vždy aktuální data bez stale stalu.
  const meRef = useRef<string | null>(null);
  const conversationsRef = useRef<ChatHeadConversation[]>([]);
  const expandedRef = useRef<string | null>(null);
  meRef.current = me;
  conversationsRef.current = conversations;
  expandedRef.current = expandedUserId;

  // Suppress chat heads, pokud uživatel sedí přímo na /zpravy/* (má full chat tam).
  const suppressed = pathname?.startsWith("/zpravy") ?? false;

  // ---------- Helper: vytáhnout/aktualizovat konverzaci ----------
  const upsertConversation = useCallback(
    async (otherUserId: string, requestId: string | null, prepend?: ChatMessage) => {
      // Pokud už máme tuhle konverzaci, jen přidám zprávu / bump pořadí.
      const existing = conversationsRef.current.find((c) => c.userId === otherUserId);
      if (existing) {
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.userId !== otherUserId) return c;
            const isExpanded = expandedRef.current === otherUserId;
            return {
              ...c,
              messages: prepend
                ? [...c.messages.filter((m) => m.id !== prepend.id), prepend]
                : c.messages,
              lastAt: prepend?.created_at ?? c.lastAt,
              unread: isExpanded ? 0 : c.unread + (prepend ? 1 : 0),
              // Pokud poslední zpráva má request_id, zvýhodňujeme tu jako "aktivní context"
              requestId: prepend?.request_id ?? c.requestId,
            };
          });
          // Bump na první pozici
          next.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
          return next.slice(0, MAX_HEADS);
        });
        return;
      }

      // Nová konverzace — dotáhneme profil + historii.
      const [{ data: profile }, { data: history }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", otherUserId)
          .single(),
        supabase
          .from("messages")
          .select("id, request_id, sender_id, receiver_id, content, is_read, created_at")
          .or(
            `and(sender_id.eq.${otherUserId},receiver_id.eq.${meRef.current}),` +
              `and(sender_id.eq.${meRef.current},receiver_id.eq.${otherUserId})`
          )
          .order("created_at", { ascending: true })
          .limit(HISTORY_LIMIT),
      ]);

      if (!profile) return;

      const messages: ChatMessage[] = ((history as ChatMessage[] | null) ?? []).map((m) => m);
      if (prepend && !messages.find((m) => m.id === prepend.id)) messages.push(prepend);

      const unread = messages.filter(
        (m) => m.receiver_id === meRef.current && !m.is_read
      ).length;

      setConversations((prev) => {
        const next: ChatHeadConversation[] = [
          {
            userId: profile.id,
            fullName: profile.full_name ?? "Uživatel",
            avatarUrl: profile.avatar_url ?? null,
            messages,
            lastAt: messages[messages.length - 1]?.created_at ?? new Date().toISOString(),
            unread,
            requestId: prepend?.request_id ?? requestId,
          },
          ...prev.filter((c) => c.userId !== profile.id),
        ];
        return next.slice(0, MAX_HEADS);
      });
    },
    []
  );

  // ---------- Mount: zjistit me + setup realtime ----------
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setMe(user.id);

      // Realtime — INSERT do messages kde já jsem receiver.
      channel = supabase
        .channel(`chat-heads-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const msg = payload.new as ChatMessage;
            // Pokud sedíme na /zpravy stránce konkrétní konverzace, nepopovat
            // (uživatel ji vidí v plné stránce).
            if (typeof window !== "undefined") {
              const here = window.location.pathname;
              if (
                here.startsWith(`/zpravy/direct/${msg.sender_id}`) ||
                (msg.request_id &&
                  here.startsWith(`/zpravy/${msg.request_id}/${msg.sender_id}`))
              ) {
                return;
              }
            }
            void upsertConversation(msg.sender_id, msg.request_id, msg);
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [upsertConversation]);

  // ---------- Akce: expand / close ----------
  const toggleExpanded = useCallback(
    (userId: string) => {
      setExpandedUserId((prev) => (prev === userId ? null : userId));
      // Při otevření vynulujeme unread a označíme přijaté zprávy jako read.
      const conv = conversationsRef.current.find((c) => c.userId === userId);
      if (conv && conv.unread > 0) {
        setConversations((prev) =>
          prev.map((c) => (c.userId === userId ? { ...c, unread: 0 } : c))
        );
        void supabase
          .from("messages")
          .update({ is_read: true })
          .eq("sender_id", userId)
          .eq("receiver_id", meRef.current!)
          .eq("is_read", false);
      }
    },
    []
  );

  const closeHead = useCallback((userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : prev));
    setConversations((prev) => prev.filter((c) => c.userId !== userId));
  }, []);

  const sendMessage = useCallback(
    async (userId: string, content: string) => {
      if (!meRef.current) return;
      const conv = conversationsRef.current.find((c) => c.userId === userId);
      const payload = {
        request_id: conv?.requestId ?? null,
        sender_id: meRef.current,
        receiver_id: userId,
        content,
        is_read: false,
      };
      const { data, error } = await supabase
        .from("messages")
        .insert(payload)
        .select("id, request_id, sender_id, receiver_id, content, is_read, created_at")
        .single();
      if (error || !data) return;
      // Pridáme zprávu do lokálního stavu (RPC notification trigger se postará o notif).
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === userId
            ? {
                ...c,
                messages: [...c.messages, data as ChatMessage],
                lastAt: (data as ChatMessage).created_at,
              }
            : c
        )
      );
      // Notifikace vytváří DB trigger trg_notify_new_message na messages (server-side).
    },
    []
  );

  if (!me || suppressed || conversations.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-24 z-[55] flex flex-col items-end gap-3 sm:bottom-28 sm:right-6"
      aria-label="Aktivní konverzace"
    >
      {/* Expanded panel — nad bubble */}
      {expandedUserId && (
        <div className="pointer-events-auto">
          <ChatPanel
            conversation={conversations.find((c) => c.userId === expandedUserId)!}
            me={me}
            onClose={() => setExpandedUserId(null)}
            onSend={(text) => sendMessage(expandedUserId, text)}
          />
        </div>
      )}

      {/* Stack bublin */}
      <div className="pointer-events-auto flex flex-col gap-2">
        {conversations.map((c) => (
          <button
            key={c.userId}
            type="button"
            onClick={() => toggleExpanded(c.userId)}
            className="group relative h-14 w-14 transform-gpu rounded-full bg-white shadow-lg ring-1 ring-gray-900/10 transition hover:scale-105 hover:shadow-xl active:scale-95"
            title={c.fullName}
            aria-label={`Konverzace s ${c.fullName}${c.unread ? ` (${c.unread} nepřečtených)` : ""}`}
          >
            <Avatar
              src={c.avatarUrl}
              name={c.fullName}
              size={56}
              className="h-full w-full"
            />
            {c.unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white ring-2 ring-white">
                {c.unread > 9 ? "9+" : c.unread}
              </span>
            )}
            {/* X tlačítko při hoveru */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                closeHead(c.userId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  closeHead(c.userId);
                }
              }}
              className="absolute -top-1 -left-1 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white ring-2 ring-white group-hover:flex"
              aria-label={`Zavřít konverzaci s ${c.fullName}`}
            >
              ✕
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
