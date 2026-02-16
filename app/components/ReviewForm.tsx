"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  requestId: string;
  providerId: string;
  customerId: string;
  onReviewSubmitted: () => void;
};

export default function ReviewForm({ requestId, providerId, customerId, onReviewSubmitted }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      request_id: requestId,
      provider_id: providerId,
      customer_id: customerId,
      rating,
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
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hodnocení
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl ${star <= rating ? "text-yellow-500" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Komentář (volitelné)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Jak jste byli spokojeni?"
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