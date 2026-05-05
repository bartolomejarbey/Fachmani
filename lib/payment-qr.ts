// SPAYD (Short Payment Descriptor) QR pro české bankovní platby.
// Formát: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
// Podporuje úplnou shodu s Tatra/KB/Raiffeisen/ČSOB/Air Bank scannery.

import QRCode from "qrcode";

type ParsedCzAccount = {
  prefix: string;
  account: string;
  bankCode: string;
};

export function parseCzAccount(input: string): ParsedCzAccount | null {
  const cleaned = input.replace(/\s/g, "");
  // Format: [prefix-]account/bankCode  (prefix je optional 1-6 cifer)
  const m = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/.exec(cleaned);
  if (!m) return null;
  return {
    prefix: m[1] || "",
    account: m[2],
    bankCode: m[3],
  };
}

// MOD-97-10 algoritmus pro arbitrary-length number string (kvuli IBAN check digits).
function modulo97(numStr: string): number {
  let remainder = 0;
  for (const ch of numStr) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder;
}

// CZ account → IBAN dle ISO 13616.
// CZ + 2 check + 4 bank + 6 prefix (zero-pad) + 10 account (zero-pad).
export function czAccountToIban(account: string): string | null {
  const parsed = parseCzAccount(account);
  if (!parsed) return null;

  const prefix = parsed.prefix.padStart(6, "0");
  const acc = parsed.account.padStart(10, "0");
  const bban = parsed.bankCode + prefix + acc;

  // 'C' = 12, 'Z' = 35  → "1235"
  const numForMod = bban + "1235" + "00";
  const mod = modulo97(numForMod);
  const check = String(98 - mod).padStart(2, "0");

  return "CZ" + check + bban;
}

export type SpaydOptions = {
  iban: string;
  amountKc: string; // např. "1.00" (s tečkou jako desetinný oddělovač per spec)
  vs: string;
  message?: string;
  recipient?: string; // RN: recipient name (max 35 znaků)
};

// SPAYD payload string. Asterisk '*' je separátor, klíče nesmí obsahovat '*'.
export function buildSpayd(opts: SpaydOptions): string {
  const parts = [
    "SPD*1.0",
    `ACC:${opts.iban}`,
    `AM:${opts.amountKc}`,
    "CC:CZK",
    `X-VS:${opts.vs}`,
  ];
  if (opts.message) parts.push(`MSG:${opts.message.slice(0, 60).replace(/\*/g, "")}`);
  if (opts.recipient) parts.push(`RN:${opts.recipient.slice(0, 35).replace(/\*/g, "")}`);
  return parts.join("*");
}

// Vrací data URL (base64 PNG) pro <img src=...> v Reactu.
export async function spaydToQrDataUrl(spayd: string): Promise<string> {
  return QRCode.toDataURL(spayd, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
