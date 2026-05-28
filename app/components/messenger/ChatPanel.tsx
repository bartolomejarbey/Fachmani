"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/app/components/Avatar";
import type { ChatHeadConversation } from "./types";

type Props = {
  conversation: ChatHeadConversation;
  me: string;
  onClose: () => void;
  onSend: (text: string) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

export default function ChatPanel({ conversation, me, onClose, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll na poslední zprávu při změně délky historie.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation.messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    if (text.length > 2000) return;
    onSend(text);
    setDraft("");
  };

  const fullChatHref =
    conversation.requestId != null
      ? `/zpravy/${conversation.requestId}/${conversation.userId}`
      : `/zpravy/direct/${conversation.userId}`;

  return (
    <div
      role="dialog"
      aria-label={`Chat s ${conversation.fullName}`}
      className="flex h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10 sm:h-[460px] sm:w-[340px] animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2.5 text-white">
        <Avatar
          src={conversation.avatarUrl}
          name={conversation.fullName}
          size={36}
          ringClass="ring-2 ring-white/40"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{conversation.fullName}</p>
          <Link
            href={fullChatHref}
            className="text-[11px] text-white/80 hover:text-white hover:underline"
          >
            Otevřít celou konverzaci →
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
          aria-label="Sbalit chat"
        >
          ✕
        </button>
      </div>

      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3"
      >
        {conversation.messages.length === 0 ? (
          <p className="mt-8 text-center text-xs text-gray-400">
            Žádné zprávy. Začněte konverzaci.
          </p>
        ) : (
          conversation.messages.map((m, idx) => {
            const mine = m.sender_id === me;
            const prev = conversation.messages[idx - 1];
            const showAvatar =
              !mine && (!prev || prev.sender_id !== m.sender_id);
            return (
              <div
                key={m.id}
                className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine && (
                  <div className="w-6 flex-shrink-0">
                    {showAvatar && (
                      <Avatar
                        src={conversation.avatarUrl}
                        name={conversation.fullName}
                        size={24}
                      />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm ${
                    mine
                      ? "rounded-br-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : "rounded-bl-sm bg-white text-gray-800 ring-1 ring-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-0.5 text-[10px] ${
                      mine ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 bg-white p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Napiš zprávu… (Enter odešle)"
            rows={1}
            className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={draft.trim().length === 0}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md transition enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
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
      </div>
    </div>
  );
}
