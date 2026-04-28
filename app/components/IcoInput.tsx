"use client";

import { useCallback, useState } from "react";
import { isValidIco } from "@/lib/ares/validate";

type AresOk = {
  status: "ok";
  ico: string;
  name: string;
  legalForm: string | null;
  dic: string | null;
  address: string | null;
};

type AresInactive = {
  status: "inactive";
  ico: string;
  name: string | null;
  reason: "deleted" | "never_active";
  datumZaniku: string | null;
};
type AresNotFound = { status: "not_found"; ico: string };
type AresError = { status: "error"; ico: string; message: string };
type AresResult = AresOk | AresInactive | AresNotFound | AresError;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (result: AresOk) => void;
  /** Pokud true, tlačítko uloží ověření do profilu uživatele (POST /api/ares/verify) */
  persistToProfile?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export default function IcoInput({
  value,
  onChange,
  onVerified,
  persistToProfile = false,
  label = "IČO",
  placeholder = "12345678",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AresResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const icoDigits = value.replace(/\D+/g, "");
  const validFormat = icoDigits.length === 8 && isValidIco(icoDigits);

  const handleLookup = useCallback(async () => {
    setError(null);
    setResult(null);
    if (!validFormat) {
      setError("Neplatné IČO (formát nebo kontrolní číslice).");
      return;
    }
    setLoading(true);
    try {
      const endpoint = persistToProfile ? "/api/ares/verify" : "/api/ares/lookup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ico: icoDigits }),
      });
      const data = (await res.json()) as { result?: AresResult; error?: string };
      if (!res.ok) {
        setError(data.error || `ARES lookup selhal (HTTP ${res.status}).`);
        if (data.result) setResult(data.result);
        return;
      }
      if (data.result) {
        setResult(data.result);
        if (data.result.status === "ok" && onVerified) onVerified(data.result);
      }
    } catch (e) {
      setError("Síťová chyba při dotazu na ARES.");
    } finally {
      setLoading(false);
    }
  }, [icoDigits, validFormat, persistToProfile, onVerified]);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setError(null);
            setResult(null);
            onChange(e.target.value.replace(/\D+/g, "").slice(0, 8));
          }}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-60"
          maxLength={8}
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={disabled || loading || !validFormat}
          className="px-5 py-3 bg-cyan-500 text-white font-semibold rounded-xl hover:bg-cyan-600 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Ověřuji..." : "Ověřit v ARES"}
        </button>
      </div>

      {icoDigits.length > 0 && icoDigits.length < 8 && (
        <p className="text-xs text-gray-500 mt-1">
          IČO musí mít 8 číslic ({icoDigits.length}/8).
        </p>
      )}
      {icoDigits.length === 8 && !validFormat && (
        <p className="text-xs text-red-600 mt-1">
          Neplatná kontrolní číslice IČO.
        </p>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {result?.status === "ok" && (
        <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 text-lg">✓</span>
            <div className="flex-1 text-sm">
              <div className="font-bold text-emerald-800">{result.name}</div>
              {result.legalForm && (
                <div className="text-emerald-700">{result.legalForm}</div>
              )}
              {result.address && (
                <div className="text-emerald-700">📍 {result.address}</div>
              )}
              {result.dic && (
                <div className="text-emerald-700">DIČ: {result.dic}</div>
              )}
              <div className="text-xs text-emerald-600 mt-1">Zdroj: ARES (MF ČR)</div>
            </div>
          </div>
        </div>
      )}

      {result?.status === "not_found" && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          ARES tento subjekt nenašel. Zkontrolujte IČO.
        </div>
      )}

      {result?.status === "inactive" && (
        <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <div className="font-semibold">
            {result.reason === "deleted"
              ? `Subjekt${result.name ? ` „${result.name}"` : ""} je v ARES zaniklý${
                  result.datumZaniku ? ` (${result.datumZaniku})` : ""
                }.`
              : `Subjekt${result.name ? ` „${result.name}"` : ""} není aktivní v žádném rejstříku.`}
          </div>
          <div className="text-xs text-red-600 mt-1">
            Pro registraci na Fachmani je potřeba aktivní subjekt.
          </div>
        </div>
      )}
    </div>
  );
}
