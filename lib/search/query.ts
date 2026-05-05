/**
 * Normalizace a sanitizace vyhledávacího dotazu.
 */

/** Odstraní diakritiku, lowercase, zkrátí a oseká mezery. */
export function normalizeQuery(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Sestaví websearch_to_tsquery-compatible řetězec.
 * Na rozdíl od websearch_to_tsquery zde ořezujeme pouze nebezpečné znaky
 * a necháme Postgres vyhodnotit.
 */
export function sanitizeForWebsearch(input: string): string {
  return (input || "")
    .replace(/[\\\n\r\t\0]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Validace: dotaz musí mít aspoň 2 znaky po normalizaci. */
export function isValidQuery(input: string): boolean {
  const n = normalizeQuery(input);
  return n.length >= 2 && n.length <= 200;
}
