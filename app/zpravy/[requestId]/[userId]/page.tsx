"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Avatar from "@/app/components/Avatar";
import BlockButton from "@/app/components/BlockButton";
import ReportButton from "@/app/components/ReportButton";

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
  avatar_url: string | null;
};

type Request = {
  id: string;
  title: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Dnes";
  const y = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === y.toDateString()) return "Včera";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [request, setRequest] = useState<Request | null>(null);

  const requestId = params.requestId as string;
  const otherUserId = params.userId as string;

  async function loadMessages(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, receiver_id, created_at")
      .eq("request_id", requestId)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  }

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setCurrentUser(user.id);

      // Phase A: profil druhého + poptávka + zprávy paralelně.
      const [{ data: userData }, { data: requestData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", otherUserId)
          .single(),
        supabase
          .from("requests")
          .select("id, title")
          .eq("id", requestId)
          .single(),
      ]);

      if (userData) setOtherUser(userData as OtherUser);
      if (requestData) setRequest(requestData as Request);

      await loadMessages(user.id);

      // Označíme příchozí zprávy jako přečtené
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("request_id", requestId)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id);

      setLoading(false);
    }

    loadData();
  }, [requestId, otherUserId, router]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`messages-${requestId}-${currentUser}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUser && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser)
          ) {
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, currentUser, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    const content = newMessage.trim().slice(0, 2000);

    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: currentUser,
      receiver_id: otherUserId,
      content,
    });

    if (error) {
      const blocked = error.message?.includes("BLOCKED") || error.code === "23514";
      alert(
        blocked
          ? "Zprávu nelze odeslat — jeden z vás druhého zablokoval."
          : "Zprávu se nepodařilo odeslat.",
      );
      setSending(false);
      return;
    }

    // Notifikace příjemci vytvoří DB trigger trg_notify_new_message (server-side).
    setNewMessage("");
    setSending(false);
  };

  // Skupiny zpráv per den + per autor (pro sbalení avatarů).
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pt-24 pb-4 sm:px-6 sm:pt-28">
        {/* Header karta */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white">
            <Link
              href="/zpravy"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 transition hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Zpět na zprávy
            </Link>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar
              src={otherUser?.avatar_url ?? null}
              name={otherUser?.full_name ?? "?"}
              size={48}
              ringClass="ring-2 ring-cyan-100"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-gray-900">
                {otherUser?.full_name ?? "Načítám…"}
              </p>
              <Link
                href={`/poptavka/${requestId}`}
                className="truncate text-xs text-cyan-600 hover:underline"
              >
                {request?.title ? `📋 ${request.title}` : "Otevřít poptávku →"}
              </Link>
            </div>
            {/* App Store 1.2 — blokování / nahlášení uživatele */}
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              <BlockButton targetUserId={otherUserId} targetName={otherUser?.full_name} />
              <ReportButton
                targetType="profile"
                targetId={otherUserId}
                targetOwnerId={otherUserId}
                label="Nahlásit"
              />
            </div>
          </div>
        </div>

        {/* Zprávy */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-3xl bg-white px-3 py-4 ring-1 ring-gray-100 sm:px-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`h-12 w-1/2 animate-pulse rounded-2xl ${
                      i % 2 === 0 ? "bg-gray-100" : "bg-cyan-100"
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl">👋</div>
              <p className="mt-3 text-base font-semibold text-gray-900">
                Začněte konverzaci
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Napište první zprávu — {otherUser?.full_name} ji dostane v reálném čase.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, idx) => {
                const mine = msg.sender_id === currentUser;
                const prev = messages[idx - 1];
                const showDayDivider =
                  !prev ||
                  new Date(prev.created_at).toDateString() !==
                    new Date(msg.created_at).toDateString();
                const showAvatar =
                  !mine && (!prev || prev.sender_id !== msg.sender_id);
                return (
                  <div key={msg.id}>
                    {showDayDivider && (
                      <div className="my-3 flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                          {formatDayLabel(msg.created_at)}
                        </span>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>
                    )}
                    <div
                      className={`flex items-end gap-2 ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!mine && (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar && (
                            <Avatar
                              src={otherUser?.avatar_url ?? null}
                              name={otherUser?.full_name ?? "?"}
                              size={32}
                            />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
                          mine
                            ? "rounded-br-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                            : "rounded-bl-sm bg-gray-50 text-gray-800 ring-1 ring-gray-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            mine ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="mt-3 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-gray-100"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Napište zprávu… (Enter odešle)"
              rows={1}
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md transition enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Odeslat zprávu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
