"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const POLL_INTERVAL_MS = 90_000; // backup pro případ selhání realtime

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const loadNotifications = useCallback(async (silent = false) => {
    const userId = userIdRef.current;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
    }
    const uid = userIdRef.current!;
    if (!silent) setIsRefreshing(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
    if (!silent) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let visibilityHandler: (() => void) | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      await loadNotifications(true);

      // Realtime: INSERT (nová notifikace) + UPDATE (read sync z jiné záložky/zařízení)
      channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new as Notification;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === next.id)) return prev;
              return [next, ...prev].slice(0, 10);
            });
            if (!next.is_read) setUnreadCount((prev) => prev + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
            // Recompute unread z aktuálního stavu (consistent count)
            setUnreadCount((_) => {
              // Nemůžeme spoléhat na předchozí count; přepočítáme z aktualizovaného notifications.
              // Jednodušší: refetch silently.
              loadNotifications(true);
              return _;
            });
          },
        )
        .subscribe();

      // Periodic poll fallback — kdyby realtime spadl (síť, sleep tab apod.)
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
          loadNotifications(true);
        }
      }, POLL_INTERVAL_MS);

      // Když user vrátí tab z background → okamžitý refresh
      visibilityHandler = () => {
        if (document.visibilityState === "visible") {
          loadNotifications(true);
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "právě teď";
    if (seconds < 3600) return `před ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `před ${Math.floor(seconds / 3600)} hod`;
    return `před ${Math.floor(seconds / 86400)} dny`;
  };

  // Barva + emoji ikona pro typ — určuje vzhled malého kroužku v notif položce.
  const TYPE_STYLES: Record<string, { emoji: string; bg: string }> = {
    new_offer: { emoji: "💼", bg: "bg-cyan-100 text-cyan-700" },
    offer_accepted: { emoji: "✅", bg: "bg-emerald-100 text-emerald-700" },
    new_message: { emoji: "💬", bg: "bg-blue-100 text-blue-700" },
    new_review: { emoji: "⭐", bg: "bg-amber-100 text-amber-700" },
    new_candidate_request: { emoji: "🎯", bg: "bg-fuchsia-100 text-fuchsia-700" },
    bank_verification_pending: { emoji: "💳", bg: "bg-orange-100 text-orange-700" },
    auto_match: { emoji: "✨", bg: "bg-violet-100 text-violet-700" },
  };
  const getStyle = (type: string) =>
    TYPE_STYLES[type] ?? { emoji: "🔔", bg: "bg-gray-100 text-gray-700" };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const next = !showDropdown;
          setShowDropdown(next);
          if (next) loadNotifications(true);
        }}
        aria-label="Notifikace"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Overlay pro zavření */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown panel */}
          <div className="absolute right-0 z-20 mt-3 w-[22rem] origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10 animate-fade-in-up">
            {/* Hlavička s gradientem */}
            <div className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold">Notifikace</h3>
                  <p className="text-[11px] text-white/80">
                    {unreadCount > 0
                      ? `${unreadCount} nepřečtená${unreadCount > 1 ? "ch" : ""}`
                      : "Vše přečteno"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadNotifications(false)}
                    disabled={isRefreshing}
                    aria-label="Obnovit notifikace"
                    title="Obnovit"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    >
                      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25"
                    >
                      Označit vše
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Seznam */}
            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <div className="text-3xl opacity-60">🔕</div>
                  <p className="text-sm font-medium text-gray-700">Žádné notifikace</p>
                  <p className="text-xs text-gray-400">Sem padají nové nabídky, zprávy a recenze.</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const style = getStyle(notification.type);
                  const inner = (
                    <div className="flex gap-3">
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-base ${style.bg}`}
                        aria-hidden="true"
                      >
                        {style.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              notification.is_read
                                ? "font-medium text-gray-700"
                                : "font-semibold text-gray-900"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-gray-500">
                            {notification.message}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-400">
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <div
                      key={notification.id}
                      className={`border-b border-gray-100 last:border-b-0 ${
                        !notification.is_read ? "bg-cyan-50/40" : ""
                      } transition-colors hover:bg-gray-50`}
                    >
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            markAsRead(notification.id);
                            setShowDropdown(false);
                          }}
                          className="block px-4 py-3"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="w-full px-4 py-3 text-left"
                        >
                          {inner}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}