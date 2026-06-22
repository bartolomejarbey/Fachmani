import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isIosAppFromRequest } from "@/lib/native-server";
import { ipRateLimited } from "@/lib/ipRateLimit";

/**
 * /api/ai/assistant
 * =================
 * Plovoucí AI asistent Fachmani (pravý dolní roh webu). Umí:
 *   1) vysvětlit, jak Fachmani fungují, a poradit s používáním webu,
 *   2) najít konkrétní fachmany v databázi (tool `search_fachmani`),
 *   3) připravit poptávku k odeslání (tool `prepare_poptavka`) — vrátí
 *      předvyplněný odkaz na /nova-poptavka, kde uživatel jedním klikem
 *      poptávku odešle (respektuje moderaci, denní limit i peněženku).
 *
 * Model: gpt-4o-mini (function calling). OPENAI_API_KEY je server-only.
 */

const SYSTEM_PROMPT = `Jsi Fachmánek — přátelský AI asistent platformy Fachmani.org. Mluvíš VŽDY česky a tykáš. Jsi stručný, lidský a konkrétní.

CO JE FACHMANI.ORG:
Online tržiště, které propojuje zákazníky s prověřenými řemeslníky a profesionály („fachmany") — řemesla, stavba, údržba, úklid, zahrada, IT, design a další.

JAK TO FUNGUJE PRO ZÁKAZNÍKA:
1. Zdarma zadá poptávku (co potřebuje, kde, rozpočet).
2. Fachmani z oboru pošlou nabídky.
3. Zákazník si vybere, domluví detaily a po dokončení může napsat recenzi.
Zákazník má 1 poptávku denně zdarma; další ten den za malý poplatek z peněženky, nebo neomezeně s Premium. Urgentní (prioritní) poptávka má příplatek, ale pár jich je měsíčně zdarma.

JAK TO FUNGUJE PRO FACHMANA:
Zaregistruje se jako poskytovatel, projde ověřením (identita + bankovní účet → modrý odznak „Ověřeno"), reaguje na poptávky nabídkami. Pár nabídek měsíčně má zdarma, pak Premium/Business pro neomezené reakce a zvýhodnění.

KLÍČOVÉ STRÁNKY (můžeš na ně odkazovat přímo v textu, např. „Zadej poptávku na /nova-poptavka"):
- /nova-poptavka — zadat poptávku
- /fachmani — katalog fachmanů
- /poptavky — veřejné poptávky (pro fachmany)
- /kategorie — kategorie služeb
- /jak-to-funguje — jak platforma funguje
- /cenik a /predplatne — ceny a Premium
- /auth/register — registrace, /auth/login — přihlášení
- /feed — komunita
- /gdpr, /vop, /cookies — právní info

DŮVĚRA A BEZPEČÍ: ověření fachmani mají modrý odznak, recenze jsou jen od reálných zákazníků po dokončené zakázce, obsah moderujeme.

JAK PRACUJEŠ:
- Když uživatel hledá konkrétní službu/řemeslníka, polož max 2 krátké upřesňující otázky (co, kde) a pak zavolej nástroj search_fachmani. Nevymýšlej si fachmany — používej jen výsledky nástroje.
- Když chce zadat poptávku, ROZHOVOREM postupně zjisti: stručný název, popis (co a v jakém rozsahu), lokalitu, případně rozpočet a zda spěchá. Než zavoláš prepare_poptavka, KRÁTCE shrň detaily a nech si je potvrdit. Poptávku NEODESÍLÁŠ ty — nástroj připraví odkaz a uživatel ji jedním klikem dokončí (i kvůli ověření a limitům).
- Na obecné dotazy „jak to funguje", ceny, ověření, recenze odpovídej rovnou z výše uvedených znalostí.

STYL: krátce (2-4 věty), bez markdown nadpisů, klidně **tučně** zvýrazni důležité. Nepřešlapuj — buď k věci. Pokud něco nevíš nebo to není o Fachmani, slušně to řekni a vrať se k tomu, jak pomoct na webu.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_fachmani",
      description:
        "Vyhledá konkrétní fachmany (řemeslníky/profesionály) v databázi Fachmani podle oboru, jména nebo lokality. Volej, až máš dostatek info (alespoň obor nebo lokalitu).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Obor nebo jméno, např. 'elektrikář', 'malíř', 'zednictví Novák'.",
          },
          kategorie: {
            type: "string",
            description: "Volitelně název kategorie služby, např. 'Elektrikářství'.",
          },
          lokalita: {
            type: "string",
            description: "Volitelně město nebo okres, např. 'České Budějovice'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_poptavka",
      description:
        "Připraví poptávku k odeslání — vrátí předvyplněný odkaz, kde ji uživatel jedním klikem dokončí. Volej až po potvrzení detailů uživatelem.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Krátký výstižný název poptávky (max 200 znaků)." },
          description: { type: "string", description: "Popis: co je potřeba a v jakém rozsahu (max 2000 znaků)." },
          lokalita: { type: "string", description: "Město nebo lokalita realizace." },
          kategorie: { type: "string", description: "Volitelně název kategorie služby." },
          budgetMin: { type: "number", description: "Volitelně minimální rozpočet v Kč." },
          budgetMax: { type: "number", description: "Volitelně maximální rozpočet v Kč." },
          urgent: { type: "boolean", description: "True, pokud jde o urgentní/prioritní poptávku." },
        },
        required: ["title", "description", "lokalita"],
      },
    },
  },
];

type SupaClient = ReturnType<typeof createServerClient>;

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Sanitizace pro PostgREST `.or()` — čárky/závorky jsou řídicí znaky.
function sanitizeTerm(s: string): string {
  return s.replace(/[(),*]/g, " ").trim().slice(0, 60);
}

async function resolveCategoryIds(supabase: SupaClient, name?: string): Promise<string[]> {
  if (!name) return [];
  const { data } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("is_active", true);
  if (!data) return [];
  type Cat = { id: string; name: string; parent_id: string | null };
  const cats = data as Cat[];
  const target = normalize(name);
  const ids: string[] = [];
  for (const c of cats) {
    if (normalize(c.name).includes(target) || target.includes(normalize(c.name))) {
      ids.push(c.id);
      // u hlavní kategorie přidej i její podkategorie
      cats.filter((x) => x.parent_id === c.id).forEach((x) => ids.push(x.id));
    }
  }
  return [...new Set(ids)];
}

async function searchFachmani(
  supabase: SupaClient,
  args: { query?: string; kategorie?: string; lokalita?: string }
) {
  const term = sanitizeTerm(args.query || "");
  const loc = sanitizeTerm(args.lokalita || "");
  const categoryIds = await resolveCategoryIds(supabase, args.kategorie);

  const results: {
    name: string;
    type: string;
    location: string | null;
    verified: boolean;
    link: string;
  }[] = [];

  // 1) Reální ověření/aktivní poskytovatelé
  // Všichni registrovaní providers jsou viditelní — trial řídí jen bidování, ne viditelnost.
  try {
    let pq = supabase
      .from("profiles")
      .select("id, full_name, is_verified, region_id")
      .eq("role", "provider")
      .limit(20);
    if (term) pq = pq.ilike("full_name", `%${term}%`);
    type ProviderRow = { id: string; full_name: string | null; is_verified: boolean; region_id: string | null };
    const { data: providers } = await pq;
    let filtered: ProviderRow[] = (providers || []) as ProviderRow[];
    if (categoryIds.length > 0 && filtered.length > 0) {
      const { data: pcs } = await supabase
        .from("provider_categories")
        .select("provider_id")
        .in("category_id", categoryIds);
      const allowed = new Set(
        ((pcs || []) as { provider_id: string }[]).map((p) => p.provider_id)
      );
      filtered = filtered.filter((p) => allowed.has(p.id));
    }
    for (const p of filtered.slice(0, 4)) {
      results.push({
        name: p.full_name || "Fachman",
        type: "Ověřený profesionál",
        location: null,
        verified: !!p.is_verified,
        link: `/fachman/${p.id}`,
      });
    }
  } catch {
    /* ignore */
  }

  // 2) Ghost subjekty (kurátorovaná databáze z ARES)
  try {
    let gq = supabase
      .from("ghost_subjects")
      .select("ico, name, category_ids, legal_address")
      .eq("is_active", true)
      .eq("gdpr_suppressed", false)
      .limit(30);
    const orParts: string[] = [];
    if (term) orParts.push(`name.ilike.*${term}*`);
    if (loc) orParts.push(`legal_address->>city.ilike.*${loc}*`);
    if (orParts.length > 0) gq = gq.or(orParts.join(","));
    if (categoryIds.length > 0) gq = gq.overlaps("category_ids", categoryIds);
    type GhostRow = { ico: string; name: string; category_ids: string[] | null; legal_address: unknown };
    const { data: ghosts } = await gq;
    for (const g of ((ghosts || []) as GhostRow[]).slice(0, 6)) {
      const city =
        g.legal_address && typeof g.legal_address === "object"
          ? ((g.legal_address as Record<string, unknown>).city as string) || null
          : null;
      results.push({
        name: g.name,
        type: "Z registru (zatím neověřeno)",
        location: city,
        verified: false,
        link: `/fachman/ghost/${g.ico}`,
      });
    }
  } catch {
    /* ignore */
  }

  return results.slice(0, 8);
}

function buildPoptavkaLink(args: {
  title: string;
  description: string;
  lokalita: string;
  kategorie?: string;
  budgetMin?: number;
  budgetMax?: number;
  urgent?: boolean;
}): string {
  const p = new URLSearchParams();
  p.set("title", String(args.title).slice(0, 200));
  p.set("description", String(args.description).slice(0, 2000));
  p.set("lokalita", String(args.lokalita).slice(0, 120));
  if (args.kategorie) p.set("kategorie", String(args.kategorie).slice(0, 80));
  if (typeof args.budgetMin === "number" && args.budgetMin >= 0)
    p.set("budgetMin", String(Math.round(args.budgetMin)));
  if (typeof args.budgetMax === "number" && args.budgetMax >= 0)
    p.set("budgetMax", String(Math.round(args.budgetMax)));
  if (args.urgent) p.set("urgent", "1");
  return `/nova-poptavka?${p.toString()}`;
}

export async function POST(request: Request) {
  try {
    // App Store: nemoderovaná generativní AI je na iOS vypnutá (1.2 / 4.7 / 5.1.2).
    // ChatWidget se na iOS vůbec nezobrazí, ale endpoint odmítáme i serverově.
    if (isIosAppFromRequest(request)) {
      return NextResponse.json({ error: "Tato funkce není v aplikaci dostupná." }, { status: 404 });
    }
    const { messages, sessionId } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const lastMessage = messages[messages.length - 1];
    if (typeof lastMessage?.content === "string" && lastMessage.content.length > 2000) {
      return NextResponse.json({ error: "Zpráva je příliš dlouhá (max 2000 znaků)." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Rate limiting (stejný vzor jako /api/ai/chat)
    if (user) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", hourAgo);
      if ((count || 0) >= 40) {
        return NextResponse.json(
          { error: "Dosáhl jsi limitu zpráv za hodinu. Zkus to prosím později.", rateLimited: true },
          { status: 429 }
        );
      }
    } else {
      // Anon: per-IP rate-limit (jinak neomezený OpenAI token burn) + limit historie.
      if (ipRateLimited(request, "ai-assistant", 15)) {
        return NextResponse.json(
          { error: "Příliš mnoho dotazů. Zkuste to prosím za chvíli nebo se přihlaste.", rateLimited: true },
          { status: 429 }
        );
      }
      if (messages.length > 12) {
        return NextResponse.json(
          { error: "Pro delší konverzaci se prosím přihlas.", rateLimited: true },
          { status: 429 }
        );
      }
    }

    const convo: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-12),
    ];

    let finalMessage = "";
    const fachmani: Awaited<ReturnType<typeof searchFachmani>> = [];
    let poptavkaLink: string | null = null;
    let totalPrompt = 0;
    let totalCompletion = 0;

    // Smyčka tool-callingu (max 3 kola)
    for (let i = 0; i < 3; i++) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: convo,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.6,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI error:", errorText);
        return NextResponse.json(
          { error: "AI služba je dočasně nedostupná. Zkus to prosím za chvíli." },
          { status: 500 }
        );
      }

      const data = await response.json();
      totalPrompt += data.usage?.prompt_tokens || 0;
      totalCompletion += data.usage?.completion_tokens || 0;
      const choice = data.choices[0].message;
      convo.push(choice);

      const toolCalls = choice.tool_calls as
        | { id: string; function: { name: string; arguments: string } }[]
        | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        finalMessage = choice.content || "";
        break;
      }

      for (const tc of toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* ignore */
        }
        let toolResult: unknown = {};
        if (tc.function.name === "search_fachmani") {
          const found = await searchFachmani(supabase, parsed as never);
          fachmani.push(...found);
          toolResult = {
            count: found.length,
            fachmani: found.map((f) => ({ name: f.name, type: f.type, location: f.location, verified: f.verified })),
            note:
              found.length === 0
                ? "Žádní fachmani nenalezeni — databáze se stále plní. Nabídni zadání poptávky."
                : "Karty fachmanů se uživateli zobrazí automaticky pod zprávou.",
          };
        } else if (tc.function.name === "prepare_poptavka") {
          poptavkaLink = buildPoptavkaLink(parsed as never);
          toolResult = {
            ok: true,
            note: "Odkaz na dokončení poptávky se uživateli zobrazí jako tlačítko. Stručně ho vyzvi, ať klikne a poptávku odešle.",
          };
        }
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    if (!finalMessage) {
      finalMessage = poptavkaLink
        ? "Poptávku mám připravenou — klikni na tlačítko níže a zkontroluj/odešli ji."
        : fachmani.length > 0
          ? "Tady jsou fachmani, kteří by mohli pomoci 👇"
          : "Jak ti můžu pomoct? Hledáš fachmana, nebo chceš zadat poptávku?";
    }

    const costUsd = totalPrompt * 0.00000015 + totalCompletion * 0.0000006;
    if (user) {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        session_id: sessionId || null,
        type: "assistant",
        prompt_tokens: totalPrompt,
        completion_tokens: totalCompletion,
        total_tokens: totalPrompt + totalCompletion,
        cost_usd: costUsd,
        user_message: typeof lastMessage?.content === "string" ? lastMessage.content : "",
        ai_response: finalMessage,
      });
    }

    return NextResponse.json({
      message: finalMessage,
      fachmani,
      poptavkaLink,
    });
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: "Interní chyba serveru. Zkus to prosím znovu." },
      { status: 500 }
    );
  }
}
