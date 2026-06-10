/**
 * Bezpečná serializace JSON-LD do <script type="application/ld+json">.
 * JSON.stringify NEescapuje `<`, `>`, `&` ani U+2028/U+2029 → uživatelská data
 * (jméno, bio) mohou „uniknout" ze script tagu a způsobit stored XSS
 * (`</script><script>…`). Tento helper je escapuje na \uXXXX, takže výstup
 * zůstává platný JSON a nedá se z něj vybřednout.
 */
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEP).join("\\u2028")
    .split(PARA_SEP).join("\\u2029");
}
