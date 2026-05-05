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

  const getIcon = (type: string) => {
    switch (type) {
      case "new_offer": return "💼";
      case "offer_accepted": return "✅";
      case "new_message": return "💬";
      case "new_review": return "⭐";
      case "new_candidate_request": return "🎯";
      case "bank_verification_pending": return "💳";
      default: return "🔔";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const next = !showDropdown;
          setShowDropdown(next);
          if (next) loadNotifications(true);
        }}
        aria-label="Notifikace"
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
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

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-3 border-b flex justify-between items-center gap-2">
              <h3 className="font-semibold">Notifikace</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadNotifications(false)}
                  disabled={isRefreshing}
                  aria-label="Obnovit notifikace"
                  className="text-gray-500 hover:text-gray-900 disabled:opacity-50"
                  title="Obnovit"
                >
                  <span className={isRefreshing ? "inline-block animate-spin" : "inline-block"}>
                    ↻
                  </span>
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Označit vše
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Žádné notifikace
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b hover:bg-gray-50 ${
                      !notification.is_read ? "bg-blue-50" : ""
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          markAsRead(notification.id);
                          setShowDropdown(false);
                        }}
                        className="block"
                      >
                        <div className="flex gap-3">
                          <span className="text-xl">{getIcon(notification.type)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {notification.message && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {getTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div
                        className="flex gap-3 cursor-pointer"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <span className="text-xl">{getIcon(notification.type)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {notification.message && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {getTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}