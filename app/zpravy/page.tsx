"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Avatar from "@/app/components/Avatar";

type Conversation = {
  request_id: string | null;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  request_title: string;
  last_message: string;
  last_message_at: string;
  last_message_mine: boolean;
  unread_count: number;
};

type Filter = "all" | "unread";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "teď";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export default function Zpravy() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadConversations() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Stáhne všechny zprávy uživatele s linkem na profily (full_name + avatar)
      // a název requestu (pokud je v kontextu poptávky).
      const { data: messages } = await supabase
        .from("messages")
        .select(
          `
          id,
          request_id,
          sender_id,
          receiver_id,
          content,
          is_read,
          created_at,
          requests(title),
          sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
        `
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messages) {
        const convMap = new Map<string, Conversation>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages.forEach((msg: any) => {
          const otherUserId =
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const otherProfile =
            msg.sender_id === user.id ? msg.receiver : msg.sender;
          const key = `${msg.request_id ?? "direct"}-${otherUserId}`;

          if (!convMap.has(key)) {
            convMap.set(key, {
              request_id: msg.request_id,
              other_user_id: otherUserId,
              other_user_name: otherProfile?.full_name ?? "Uživatel",
              other_user_avatar: otherProfile?.avatar_url ?? null,
              request_title: msg.request_id
                ? msg.requests?.title ?? "Poptávka"
                : "Přímá zpráva",
              last_message: msg.content,
              last_message_at: msg.created_at,
              last_message_mine: msg.sender_id === user.id,
              unread_count: 0,
            });
          }

          if (!msg.is_read && msg.receiver_id === user.id) {
            convMap.get(key)!.unread_count++;
          }
        });

        setConversations(Array.from(convMap.values()));
      }

      setLoading(false);
    }

    loadConversations();
  }, [router]);

  const visible = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.other_user_name.toLowerCase().includes(q) ||
          c.request_title.toLowerCase().includes(q) ||
          c.last_message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, query]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32">
        {/* Hlavička */}
        <div className="mb-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Zprávy</h1>
              <p className="mt-1 text-sm text-gray-500">
                {totalUnread > 0
                  ? `${totalUnread} nepřečtená${totalUnread > 1 ? "ch" : ""}`
                  : "Vše přečteno"}
              </p>
            </div>
          </div>

          {/* Search + filter */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat v konverzacích…"
                className="w-full rounded-full border border-gray-200 bg-white py-2.5 pr-4 pl-9 text-sm placeholder-gray-400 transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
              />
            </div>
            <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-gray-200">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === "all"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Vše
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === "unread"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Nepřečtené
                {totalUnread > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      filter === "unread"
                        ? "bg-white/25 text-white"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Seznam konverzací */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100"
              >
                <div className="h-12 w-12 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-gray-100">
            <div className="text-5xl">💬</div>
            <p className="mt-4 text-base font-semibold text-gray-900">
              {query || filter === "unread"
                ? "Žádné výsledky"
                : "Zatím žádné konverzace"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {query || filter === "unread"
                ? "Zkuste jiné hledání nebo zrušte filtr."
                : "Až si napíšete s fachmanem či zákazníkem, najdete to tu."}
            </p>
            {(query || filter === "unread") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                Vymazat filtry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
            {visible.map((conv, idx) => {
              const href = conv.request_id
                ? `/zpravy/${conv.request_id}/${conv.other_user_id}`
                : `/zpravy/direct/${conv.other_user_id}`;
              const preview = conv.last_message_mine
                ? `Vy: ${conv.last_message}`
                : conv.last_message;
              return (
                <Link
                  key={`${conv.request_id ?? "direct"}-${conv.other_user_id}`}
                  href={href}
                  className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 ${
                    idx !== visible.length - 1 ? "border-b border-gray-100" : ""
                  } ${conv.unread_count > 0 ? "bg-cyan-50/40" : ""}`}
                >
                  <Avatar
                    src={conv.other_user_avatar}
                    name={conv.other_user_name}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate ${
                          conv.unread_count > 0
                            ? "font-bold text-gray-900"
                            : "font-semibold text-gray-800"
                        }`}
                      >
                        {conv.other_user_name}
                      </p>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {formatTimestamp(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-cyan-600">
                      {conv.request_title}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          conv.unread_count > 0
                            ? "font-semibold text-gray-800"
                            : "text-gray-500"
                        }`}
                      >
                        {preview}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
