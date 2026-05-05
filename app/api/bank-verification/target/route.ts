import { NextResponse } from "next/server";
import { czAccountToIban, buildSpayd, spaydToQrDataUrl } from "@/lib/payment-qr";

export const runtime = "nodejs";

// GET /api/bank-verification/target
// Vrací univerzální payment QR (bez VS) + číslo účtu, aby fachman viděl
// kam pošle 1 Kč ještě PŘED tím, než si vygeneruje vlastní VS přes
// /initiate. Smysl: transparentnost + důvěra („vidím že platím reálnou
// firmu na reálný účet"). Skutečné ověření párujeme přes VS, takže
// preview QR bez VS nelze zneužít k podvržení ověření.

const RAW_TARGET = process.env.BANK_VERIFICATION_TARGET_ACCOUNT || "TODO/0000";
// Strip placeholder cruft (úhlové závorky, mezery, uvozovky) — některé Vercel
// env vars přes UI končí jako "<8208230004>/<5500>" pokud admin zkopíruje
// placeholder ze spec dokumentu.
const TARGET_ACCOUNT = RAW_TARGET.replace(/[^0-9/-]/g, "");

export async function GET() {
  const targetIban = czAccountToIban(TARGET_ACCOUNT);
  let qrDataUrl: string | null = null;
  if (targetIban) {
    // Preview QR: bez VS, s message "Fachmani overeni" — slouží pouze
    // k zobrazení účtu, neuloží se jako platba pro konkrétního uživatele.
    const spayd = buildSpayd({
      iban: targetIban,
      amountKc: "1.00",
      vs: "",
      message: "Fachmani overeni",
      recipient: "Fachmani",
    });
    try {
      qrDataUrl = await spaydToQrDataUrl(spayd);
    } catch (e) {
      console.error("[bank-verification/target] QR gen failed:", e);
    }
  }

  return NextResponse.json(
    {
      target_account: TARGET_ACCOUNT,
      target_iban: targetIban,
      amount_kc: "1.00",
      qr_data_url: qrDataUrl,
    },
    {
      // 1 hod cache — data jsou statická, pouze závislá na env var
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    },
  );
}
