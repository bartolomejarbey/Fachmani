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
  key: "reliability" | "communication" | "payment";
  label: string;
  hint: string;
};

const DIMENSIONS: Dimension[] = [
  { key: "reliability", label: "Spolehlivost", hint: "Dorazil na domluvený termín, nezrušil zakázku na poslední chvíli" },
  { key: "communication", label: "Komunikace", hint: "Reagoval včas, sdělil potřebné informace" },
  { key: "payment", label: "Platební morálka", hint: "Zaplatil dohodnutou cenu včas" },
];

export default function CustomerReviewForm({ requestId, providerId, customerId, onReviewSubmitted }: Props) {
  const [ratings, setRatings] = useState<Record<Dimension["key"], number>>({
    reliability: 5,
    communication: 5,
    payment: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRating = (key: Dimension["key"], value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== providerId) {
      setError("Nejste přihlášen jako fachman této zakázky.");
      setSubmitting(false);
      return;
    }

    if (comment && comment.length > 2000) {
      setError("Komentář může mít max. 2000 znaků.");
      setSubmitting(false);
      return;
    }

    const provisional = Math.round(
      ratings.reliability * 0.4 + ratings.communication * 0.3 + ratings.payment * 0.3,
    );

    const { error: insertError } = await supabase.from("customer_reviews").insert({
      request_id: requestId,
      provider_id: providerId,
      customer_id: customerId,
      rating: Math.max(1, Math.min(5, provisional)),
      rating_reliability: ratings.reliability,
      rating_communication: ratings.communication,
      rating_payment: ratings.payment,
      comment: comment || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    onReviewSubmitted();
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800">✓ Děkujeme za hodnocení zákazníka!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <h3 className="font-semibold mb-1">Ohodnoťte zákazníka</h3>
      <p className="text-xs text-gray-600 mb-3">
        Vaše hodnocení uvidí ostatní fachmani před tím, než nabídnou tomuto zákazníkovi své služby.
      </p>

      <div className="space-y-3 mb-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-sm font-semibold text-gray-800">{dim.label}</div>
                <div className="text-xs text-gray-500">{dim.hint}</div>
              </div>
              <div className="text-sm font-bold text-purple-700">{ratings[dim.key]}/5</div>
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
          placeholder="Jak probíhala spolupráce? (zákazník to neuvidí jako anonymní, ale vaše jméno se nezobrazuje veřejně)"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? "Odesílám..." : "Odeslat hodnocení"}
      </button>
    </form>
  );
}
