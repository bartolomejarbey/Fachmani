/**
 * NACE → fachmani.cz kategorie mapping.
 *
 * ARES vrací u každého subjektu pole `czNace` s desítkami kódů různé délky
 * (2–5 cifer) plus „nesmysly" jako "G", "00", "M" (sekce). Mapujeme je na
 * naše kategorie přes longest-prefix-wins lookup do statické tabulky.
 *
 * Použití:
 *   import { naceToCategoryIds } from "@/lib/ares/nace-categories";
 *   const ids = naceToCategoryIds(["4120", "4321", "G"], categoryBySlug);
 *   // → [stavebnictvi-uuid, elektrikar-uuid, elektro-voda-topeni-uuid]
 *
 * Zdroje pro mapping:
 *   ČSÚ CZ-NACE číselník (https://www.czso.cz/csu/czso/klasifikace_ekonomickych_cinnosti_cz_nace)
 *   Sample 1 000 reálných ghost záznamů z naší DB (4/2026).
 */

// -------------------------------------------------------------------------
// NACE prefix → category slug
// Klíče různé délky; `naceToSlugs` zkouší longest-first.
// -------------------------------------------------------------------------
export const NACE_PREFIX_TO_SLUG: Record<string, string> = {
  // === 41 Výstavba budov ============================================
  "41":   "stavebnictvi",
  "412":  "stavebnictvi",
  "4120": "stavebnictvi",

  // === 42 Inženýrské stavitelství ===================================
  "42":   "stavebnictvi",
  "421":  "stavebnictvi",
  "4211": "stavebnictvi",
  "4212": "stavebnictvi",
  "4213": "stavebnictvi",
  "4221": "instalater",      // Inženýrské sítě (potrubí, voda, plyn)
  "4222": "elektrikar",      // Elektrické a telekomunikační sítě
  "4291": "stavebnictvi",
  "4299": "stavebnictvi",

  // === 43 Specializované stavební činnosti ==========================
  "43":   "stavebnictvi",
  "431":  "stavebnictvi",
  "4311": "demolice",
  "4312": "stavebnictvi",
  "4313": "stavebnictvi",
  "432":  "elektro-voda-topeni",
  "4321": "elektrikar",
  "4322": "instalater",
  "4329": "elektro-voda-topeni",
  "433":  "stavebnictvi",
  "4331": "malir",            // Omítkářské
  "4332": "truhlar",          // Truhlářské + tesařské stavební
  "4333": "podlahar",         // Obkladačské + podlahářské + malířské
  "4334": "malir",            // Sklenářské + malířské + natěračské
  "4339": "cisteni-fasad",
  "439":  "stavebnictvi",
  "4391": "strechy",
  "4399": "stavebnictvi",

  // === 45 Velkoobchod, maloobchod, opravy mot. vozidel ==============
  "45":   "auto-moto",
  "451":  "auto-moto",
  "4511": "auto-moto",
  "4519": "auto-moto",
  "452":  "autoservis",
  "4520": "autoservis",
  "453":  "auto-moto",
  "454":  "auto-moto",        // Motocykly + díly

  // === 49 Pozemní + potrubní doprava ===============================
  "49":   "doprava",
  "491":  "doprava",
  "4910": "doprava",
  "4920": "doprava",
  "493":  "doprava",
  "4931": "doprava",
  "4932": "odtahova-sluzba",  // Taxi
  "4939": "doprava",
  "494":  "doprava",
  "4941": "doprava",
  "4942": "stehovani",

  // === 14 Oděvy =====================================================
  "14":   "krejci",
  "141":  "krejci",
  "1411": "krejci",
  "1412": "krejci",
  "1413": "krejci",
  "1419": "krejci",
  "143":  "krejci",

  // === 16 Zpracování dřeva (kromě nábytku) ==========================
  "16":   "truhlar",
  "162":  "truhlar",
  "1621": "truhlar",
  "1622": "podlahar",         // Skládané parkety
  "1623": "truhlar",          // Stavebně truhlářské výrobky
  "1624": "truhlar",
  "1629": "truhlar",

  // === 23 Sklo, beton, keramika =====================================
  "231":  "sklenar",
  "2311": "sklenar",
  "2312": "sklenar",
  "2319": "sklenar",
  "236":  "betonovani",
  "2361": "betonovani",

  // === 25 Kovové výrobky ============================================
  "25":   "zamecnictvi",
  "251":  "zamecnictvi",
  "2511": "zamecnictvi",
  "2512": "zamecnictvi",
  "2521": "kotle-topeni",     // Kotle ústředního topení
  "256":  "zamecnictvi",
  "2561": "zamecnictvi",
  "2562": "zamecnictvi",
  "257":  "zamecnik",
  "2571": "zamecnik",
  "2572": "zamecnik",
  "2573": "zamecnictvi",
  "259":  "zamecnictvi",
  "2599": "zamecnictvi",

  // === 31 Nábytek ===================================================
  "31":   "truhlarstvi",
  "310":  "truhlarstvi",
  "3101": "truhlarstvi",
  "3102": "truhlarstvi",
  "3109": "truhlarstvi",

  // === 33 Opravy a instalace strojů =================================
  "33":   "oprava-spotrebicu",
  "331":  "oprava-spotrebicu",
  "3311": "zamecnictvi",
  "3312": "zamecnictvi",
  "3314": "elektrikar",
  "3320": "instalater",

  // === 38 Odpady (sběr + zpracování → úklid) ========================
  "38":   "uklid",
  "381":  "uklid",
  "3811": "uklid",
  "3812": "uklid",
  "382":  "uklid",
  "3821": "uklid",
  "3822": "uklid",

  // === 56 Stravování ================================================
  "561":  "catering",
  "5610": "catering",
  "5621": "catering",
  "5629": "catering",

  // === 62 IT ========================================================
  "62":   "it",
  "620":  "it",
  "6201": "it",
  "6202": "it-podpora",
  "6203": "it-podpora",
  "6209": "it",
  "631":  "it",
  "6311": "it",
  "6312": "webove-stranky",

  // === 69 Právo + účetnictví ========================================
  "691":  "pravni-sluzby",
  "6910": "pravni-sluzby",
  "692":  "ucetnictvi",
  "6920": "ucetnictvi",

  // === 70 Vedení podniků + poradenství =============================
  "702":  "poradenstvi",
  "7021": "poradenstvi",
  "7022": "poradenstvi",

  // === 71 Architektura + inženýrství ===============================
  "71":   "stavebnictvi",
  "711":  "stavebnictvi",
  "7111": "stavebnictvi",
  "7112": "stavebnictvi",

  // === 73 Reklama, marketing =======================================
  "73":   "marketing",
  "731":  "marketing",
  "7311": "marketing",
  "7312": "marketing",
  "732":  "marketing",

  // === 74 Ostatní profesionální činnosti ===========================
  "741":  "graficky-design",
  "7410": "graficky-design",
  "742":  "fotograf",
  "7420": "fotograf",
  "749":  "poradenstvi",
  "7490": "poradenstvi",

  // === 75 Veterinární ==============================================
  "75":   "veterinar",
  "750":  "veterinar",
  "7500": "veterinar",

  // === 79 Cestovní + rezervační ====================================
  "79":   "udalosti",
  "791":  "udalosti",
  "799":  "udalosti",

  // === 81 Úklid + zahrada ==========================================
  "81":   "uklid",
  "811":  "uklid",
  "812":  "uklid",
  "8121": "uklid",
  "8122": "uklid",
  "8129": "uklid",
  "813":  "udrzba-zelene",
  "8130": "udrzba-zelene",

  // === 82 Administrativa ===========================================
  "82":   "ucetni",
  "821":  "ucetni",
  "8211": "ucetni",

  // === 85 Vzdělávání ===============================================
  "85":   "doucovani",
  "8551": "osobni-trener",     // Sportovní vzdělávání
  "8552": "doucovani",         // Umělecké vzdělávání
  "8559": "jazykove-kurzy",

  // === 86–88 Zdraví + sociální péče ================================
  "881":  "hlidani",
  "8810": "hlidani",
  "8891": "hlidani",

  // === 90 Tvůrčí, umělecké ========================================
  "9001": "udalosti",          // Performing arts
  "9002": "dj-hudba",          // Podpora performing arts
  "9003": "design",            // Umělecká tvorba

  // === 93 Sport, zábava ============================================
  "9313": "osobni-trener",
  "9319": "osobni-trener",
  "9329": "udalosti",

  // === 95 Opravy spotřebičů ========================================
  "95":   "oprava-spotrebicu",
  "951":  "oprava-spotrebicu",
  "9511": "it-podpora",        // Opravy počítačů
  "9512": "it-podpora",        // Opravy mobilů
  "952":  "oprava-spotrebicu",
  "9521": "oprava-spotrebicu",
  "9522": "oprava-spotrebicu",
  "9523": "oprava-obuvi",
  "9524": "truhlar",           // Opravy nábytku
  "9525": "hodinar",
  "9529": "oprava-spotrebicu",

  // === 96 Ostatní osobní služby ====================================
  "96":   "krasa-pece",
  "9601": "cisteni-kobercu",   // Praní + chemické čištění
  "9602": "krasa-pece",        // Kadeřnictví
  "9603": "udalosti",          // Pohřební
  "9604": "krasa-pece",        // Sauny, lázně
  "9609": "krasa-pece",        // Ostatní (zahrnuje grooming)
};

// Pre-compute longest-first key list once.
const SORTED_KEYS = Object.keys(NACE_PREFIX_TO_SLUG).sort(
  (a, b) => b.length - a.length,
);

// -------------------------------------------------------------------------
// naceToSlugs
// -------------------------------------------------------------------------
/**
 * Vrátí unikátní seznam category slugs odvozených z pole NACE kódů.
 * - Longest-prefix-wins (pětimístný kód má přednost před čtyřmístným).
 * - Prázdné / non-string / kódy bez matche se ignorují.
 */
export function naceToSlugs(naces: readonly (string | number | null | undefined)[]): string[] {
  const slugs = new Set<string>();
  for (const raw of naces) {
    if (raw == null) continue;
    const code = String(raw).trim();
    if (!code) continue;
    for (const prefix of SORTED_KEYS) {
      if (code.startsWith(prefix)) {
        slugs.add(NACE_PREFIX_TO_SLUG[prefix]);
        break;
      }
    }
  }
  return Array.from(slugs);
}

// -------------------------------------------------------------------------
// slugsToCategoryIds
// -------------------------------------------------------------------------
export type CategoryRef = { id: string; parent_id: string | null };

/**
 * Vrátí pole UUIDů kategorií pro zadané slugs. Pro subkategorie přidává
 * i UUID rodiče (top-level), aby filtr "stavebnictvi" zachytil i
 * subjekty taggované specifickou subkategorií jako "elektrikar".
 */
export function slugsToCategoryIds(
  slugs: readonly string[],
  categoryBySlug: ReadonlyMap<string, CategoryRef>,
): string[] {
  const ids = new Set<string>();
  for (const slug of slugs) {
    const cat = categoryBySlug.get(slug);
    if (!cat) continue;
    ids.add(cat.id);
    if (cat.parent_id) ids.add(cat.parent_id);
  }
  return Array.from(ids);
}

// -------------------------------------------------------------------------
// naceToCategoryIds (composition pro pohodlí)
// -------------------------------------------------------------------------
export function naceToCategoryIds(
  naces: readonly (string | number | null | undefined)[],
  categoryBySlug: ReadonlyMap<string, CategoryRef>,
): string[] {
  return slugsToCategoryIds(naceToSlugs(naces), categoryBySlug);
}
