// Validace IČO (CZ) — modulo 11
// Vstup: řetězec (libovolná délka). Povoleny pouze číslice.
// IČO má 8 znaků. Kontrolní číslice se počítá z prvních 7.

export function normalizeIco(input: string): string {
  return (input || "").replace(/\D+/g, "").padStart(8, "0").slice(-8);
}

export function isValidIco(input: string): boolean {
  const ico = (input || "").replace(/\D+/g, "");
  if (ico.length !== 8) return false;
  if (!/^\d{8}$/.test(ico)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += Number(ico[i]) * weights[i];
  }
  const mod = sum % 11;
  let expectedCheck: number;
  if (mod === 0) expectedCheck = 1;
  else if (mod === 1) expectedCheck = 0;
  else expectedCheck = 11 - mod;

  return Number(ico[7]) === expectedCheck;
}
