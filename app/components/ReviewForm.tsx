"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  requestId: string;
  providerId: string;
  customerId: string;
  onReviewSubmitted: () => void;
};

type Dimension = {
  key: "quality" | "communication" | "price";
  label: string;
  hint: string;
};

const DIMENSIONS: Dimension[] = [
  { key: "quality", label: "Kvalita práce", hint: "Jak dobře byla zakázka odvedená" },
  { key: "communication", label: "Komunikace", hint: "Reakce, dochvilnost, srozumitelnost" },
  { key: "price", label: "Cena", hint: "Poměr cena / výkon" },
];

export default function ReviewForm({ requestId, providerId, customerId, onReviewSubmitted }: Props) {
  const [ratings, setRatings] = useState<Record<Dimension["key"], number>>({
    quality: 5,
    communication: 5,
    price: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setRating = (key: Dimension["key"], value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== customerId) {
      setSubmitting(false);
      return;
    }

    if (comment && comment.length > 2000) {
      setSubmitting(false);
      return;
    }

    // Overall `rating` se odvodí triggerem na DB straně z 3 dimenzí.
    // Posíláme jen dimenze + komentář — `rating` necháme triggeru.
    // Ale schéma má rating NOT NULL, takže pošleme provizorní (trigger ho přepíše).
    const provisional = Math.round(
      ratings.quality * 0.4 + ratings.communication * 0.3 + ratings.price * 0.3,
    );

    const { error } = await supabase.from("reviews").insert({
      request_id: requestId,
      provider_id: providerId,
      customer_id: customerId,
      rating: Math.max(1, Math.min(5, provisional)),
      rating_quality: ratings.quality,
      rating_communication: ratings.communication,
      rating_price: ratings.price,
      comment: comment || null,
    });

    if (!error) {
      setSubmitted(true);
      onReviewSubmitted();
    }

    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800">✓ Děkujeme za vaše hodnocení!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Ohodnoťte fachmana</h3>

      <div className="space-y-3 mb-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-sm font-semibold text-gray-800">{dim.label}</div>
                <div className="text-xs text-gray-500">{dim.hint}</div>
              </div>
              <div className="text-sm font-bold text-blue-700">{ratings[dim.key]}/5</div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(dim.key, star)}
                  className={`text-2xl ${star <= ratings[dim.key] ? "text-yellow-500" : "text-gray-300"} hover:scale-110 transition-transform`}
                  aria-label={`${dim.label} ${star} z 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Komentář (volitelné)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Jak jste byli spokojeni? Co byste vyzdvihli?"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Odesílám..." : "Odeslat hodnocení"}
      </button>
    </form>
  );
}
