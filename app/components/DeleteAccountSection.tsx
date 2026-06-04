"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Trvalé smazání účtu (App Store guideline 5.1.1(v)) — dostupné pro VŠECHNY uživatele
 * (zákazníky i fachmany). Dvoukrokové potvrzení (napsat „SMAZAT").
 */
export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Účet se nepodařilo smazat. Zkuste to znovu nebo napište na info@fachmani.org.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/?deleted=1");
    } catch {
      alert("Síťová chyba. Zkuste to prosím znovu.");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
      <h2 className="text-lg font-bold text-red-700 mb-2">Smazat účet</h2>
      <p className="text-sm text-gray-600 mb-4">
        Trvalé smazání účtu odstraní váš profil, poptávky, nabídky, recenze, zprávy a osobní údaje.
        Tuto akci nelze vrátit zpět. Účetní doklady zůstávají anonymizovaně archivované v souladu se zákonem.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Trvale smazat účet
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Pro potvrzení napište do pole níže <strong>SMAZAT</strong>:
          </p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="SMAZAT"
            className="w-full max-w-xs rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={text.trim().toUpperCase() !== "SMAZAT" || deleting}
              onClick={handleDelete}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Mažu účet…" : "Potvrdit trvalé smazání"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setText(""); }}
              disabled={deleting}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
