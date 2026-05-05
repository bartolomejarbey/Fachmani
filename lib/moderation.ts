// AI moderation helper — wraps OpenAI moderations endpoint + CZ keyword pre-filter.
//
// OpenAI omni-moderation-latest má slabou pokrývku českých výrazů (rasismus,
// extremismus, sexismus). První průchod proto děláme přes lokální blocklist
// s normalizací (lowercase, bez diakritiky, slovní hranice). Když match,
// rovnou flagged=true a OpenAI se nevolá.

export type ModerationResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
  matchedTerms?: string[];
  source: "cs_blocklist" | "openai" | "openai_failed_cs_clean";
  raw: unknown;
};

// Czech / Slovak hate speech, slurs, drugs, sexual content, scam keywords.
// Keep lowercase + ASCII (input se normalizuje stejně).
// Stems jsou navržené tak, aby pokryly skloňování ("negr", "negry", "negrum"...).
const CS_BLOCKLIST_STEMS: string[] = [
  // Rasistické / etnické nadávky
  "negr", "cernoch debil", "zid spinav", "cikan", "cigan", "rom debil",
  "haj sieg", "hajluj", "sieg heil", "white power", "vsichni zide",
  "smrt zidum", "smrt cikanum", "smrt romum", "smrt muslim",
  // Homofobie / transfobie
  "tepl debil", "buzerant", "buzna", "pedofil", "kkt teplous",
  // Sexuální / vulgární útoky
  "kkt", "kunda", "piča", "pica ", "pic ", "mrdam", "mrdat", "kurva matko",
  "zkurvysyn", "zmrd", "zmrde", "debil", "pojeb",
  "chcip", "umri", "zabij se", "sebevrazda navod",
  // Drogy — návody / prodej
  "prodavam pervitin", "kde koupit kokain", "navod meth", "navod pervitin",
  // Sex obsah
  "porno video", "sex zdarma", "nahaty obrazek", "intimni foto zdarma",
  // Scam / spam
  "vyhrali jste milion", "kliknete pro penize", "bitcoin zdarma",
];

// Normalize: lowercase, remove diacritics, collapse whitespace.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkCsBlocklist(text: string): { hit: boolean; matched: string[] } {
  const norm = normalize(text);
  const matched: string[] = [];
  for (const stem of CS_BLOCKLIST_STEMS) {
    if (stem.includes(" ")) {
      // víceslovný — substring match na normalizaci
      if (norm.includes(stem)) matched.push(stem);
    } else {
      // slovní stem — \bstem (a libovolná koncovka)
      const re = new RegExp(`(^|\\s)${stem}[a-z]*`, "i");
      if (re.test(norm)) matched.push(stem);
    }
  }
  return { hit: matched.length > 0, matched };
}

export async function moderateText(text: string): Promise<ModerationResult> {
  // Krok 1: lokální CZ blocklist (rychlé, deterministické, žádné API)
  const cs = checkCsBlocklist(text);
  if (cs.hit) {
    return {
      flagged: true,
      categories: { hate: true, harassment: true },
      category_scores: { hate: 1, harassment: 1 },
      matchedTerms: cs.matched,
      source: "cs_blocklist",
      raw: { cs_blocklist: cs.matched },
    };
  }

  // Krok 2: OpenAI omni-moderation
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY není nastaven");
  }

  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: text,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenAI moderation API selhalo: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  const result = data?.results?.[0];
  if (!result) {
    throw new Error("OpenAI moderation API vrátilo prázdné výsledky");
  }

  return {
    flagged: !!result.flagged,
    categories: result.categories ?? {},
    category_scores: result.category_scores ?? {},
    source: "openai",
    raw: data,
  };
}
