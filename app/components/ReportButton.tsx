"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Univerzální tlačítko „Nahlásit" pro uživatelský obsah (App Store 1.2).
 * Zapisuje do `content_reports` (RLS: reporter_id = auth.uid()).
 * Použití: recenze, zprávy, profily. (Feed posty mají vlastní report v app/feed.)
 */
type TargetType = "review" | "message" | "profile" | "comment";

const REASONS: { value: string; label: string }[] = [
  { value: "inappropriate", label: "Nevhodný obsah" },
  { value: "harassment", label: "Obtěžování nebo urážky" },
  { value: "spam", label: "Spam" },
  { value: "fraud", label: "Podvod" },
  { value: "fake", label: "Falešný profil nebo obsah" },
  { value: "other", label: "Jiný důvod" },
];

export default function ReportButton({
  targetType,
  targetId,
  targetOwnerId = null,
  label = "Nahlásit",
  className = "",
}: {
  targetType: TargetType;
  targetId: string;
  targetOwnerId?: string | null;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Pro nahlášení se prosím přihlas.");
      setSubmitting(false);
      return;
    }
    const { error: insErr } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_owner_id: targetOwnerId,
      reason,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (insErr) {
      // 23505 = unique violation → už nahlášeno tímto uživatelem
      if (insErr.code === "23505") {
        setDone(true);
        setOpen(false);
        return;
      }
      setError("Nahlášení se nezdařilo. Zkus to prosím znovu.");
      return;
    }
    setDone(true);
    setOpen(false);
  };

  if (done) {
    return (
      <span className={`text-xs text-gray-400 ${className}`} title="Děkujeme, obsah jsme předali ke kontrole.">
        ✓ Nahlášeno
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs text-gray-400 transition-colors hover:text-red-500 ${className}`}
        aria-label="Nahlásit obsah"
        title="Nahlásit obsah"
      >
        🚩 {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>🚩</span> Nahlásit obsah
            </h3>
            <p className="text-xs text-gray-500">
              Pomoz nám udržet Fachmany bezpečné. Nahlášený obsah zkontroluje náš tým a v případě porušení
              pravidel jej odstraníme.
            </p>

            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="text-cyan-500 focus:ring-cyan-400"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Doplňující informace (nepovinné)…"
              className="w-full resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-cyan-400"
            />

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? "Odesílám…" : "Nahlásit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
