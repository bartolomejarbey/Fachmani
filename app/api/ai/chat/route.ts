import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SYSTEM_PROMPT = `Jsi AI asistent platformy Fachmani.org. Tvým úkolem je POMÁHAT UŽIVATELŮM NAJÍT KONKRÉTNÍHO FACHMANA z naší databáze. NEJSI obecný poradce.

TVŮJ FLOW:

KROK 1 — Uvítání a identifikace potřeby:
Když uživatel napíše co potřebuje (např. "hledám webového vývojáře", "potřebuji vymalovat byt", "chci opravit kotel"), NEZAČÍNEJ dávat obecné rady nebo red flags. Místo toho se zeptej na 2-3 upřesňující otázky které potřebuješ pro doporučení fachmana.

KROK 2 — Upřesňující otázky:
Polož maximálně 3 otázky najednou. Otázky musí být KONKRÉTNÍ podle typu služby:

Pro WEBY/IT:
- Co přesně potřebuješ? (webová stránka, e-shop, aplikace, redesign, oprava)
- Jaký je rozsah? (jednoduchá prezentace / středně složitý projekt / velký projekt)
- Máš preferovanou technologii? (WordPress, custom, není důležité)
(Lokalita NENÍ důležitá — web se dělá remote)

Pro MALÍŘE:
- Kolik m² potřebuješ vymalovat?
- Kolik pokojů a jaký stav zdí? (čistá malba / přes starou / stěrka)
- Z jaké jsi lokality? (pro doporučení fachmana v okolí)

Pro INSTALATÉRY/ELEKTRIKÁŘE/ŘEMESLA:
- Co konkrétně potřebuješ? (oprava / nová instalace / rekonstrukce)
- Jak je to urgentní? (havárie / do týdne / není spěch)
- Kde se nacházíš? (město/okres)

Pro ÚKLID/ZAHRADU/ŘEMESLA obecně:
- Jaký typ služby přesně? (jednorázový / pravidelný / speciální)
- Velikost / rozsah?
- Lokalita?

Pro OSTATNÍ:
Polož 2-3 otázky relevantní k tomu oboru.

KROK 3 — Shrnutí a doporučení:
Po získání odpovědí NAPIŠ krátké shrnutí co jsi pochopil a oznam uživateli že hledáš v databázi. Text ukonči frází: "Hledám pro tebe v naší databázi..." — tuto frázi systém použije jako signál že má spustit DB query.

KROK 4 — Po zobrazení fachmanů:
Systém sám zobrazí karty fachmanů. Ty jen doplň krátkou zprávu jako "Tady jsou fachmani kteří by mohli pomoci. Klikni na profil pro detail nebo zadej poptávku rovnou jim."

JAK ODPOVÍDÁŠ:
- Vždy česky, tykáš
- KRÁTCE (max 3-4 věty, případně číslovaný seznam otázek)
- Žádné obecné rady o red flags, referencích, cenách — to tě nezajímá, tvoje práce je NAJÍT FACHMANA
- Žádné markdown nadpisy (###) — používej jen **tučný text** nebo jednoduché odrážky
- Přátelský tón, ale cílený

KONTEXT PLATFORMY:
Fachmani.org je čerstvě spuštěná platforma. Databáze fachmanů se teprve plní, takže se může stát že na některé obory zatím nikoho nemáme. Pokud systém nenajde žádné fachmany, nebudeš to vysvětlovat — systém zobrazí vlastní zprávu.

CO NESMÍŠ:
- Dávat obecné rady o výběru řemeslníků (na to máme jiné stránky)
- Odpovídat na otázky MIMO téma (politika, kódování, recepty, obecné znalosti)
- Doporučovat konkurenci
- Vysvětlovat jak web funguje nebo dávat technické rady

POKUD SE PTAJÍ MIMO TÉMA:
"Jsem asistent pro hledání fachmanů na Fachmani.org. S touto otázkou ti nepomohu, ale pokud potřebuješ řemeslníka, IT profesionála nebo jinou službu, rád tě propojím se správným fachmanem. Co hledáš?"

POKUD SE PTAJÍ "MÁTE TIPY NA NĚJAKÉHO FACHMANA":
Tohle je PŘESNĚ tvoje práce! Nepovažuj to za off-topic. Začni flow od kroku 2 — zeptej se na upřesňující otázky.`;

export async function POST(request: Request) {
  try {
    const { messages, sessionId } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Get user (optional - chat works for anonymous too)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting - max 20 messages per hour
    if (user) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", hourAgo);

      if ((count || 0) >= 20) {
        return NextResponse.json(
          {
            error: "Dosáhl jsi limitu 20 zpráv za hodinu. Zkus to prosím později.",
            rateLimited: true,
          },
          { status: 429 }
        );
      }
    }

    // Limit history to last 10 messages to control token usage
    const recentMessages = messages.slice(-10);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...recentMessages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return NextResponse.json(
        { error: "AI služba dočasně nedostupná. Zkus to prosím za chvíli." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;
    const usage = data.usage;

    // Cost: GPT-4o mini $0.150/1M input, $0.600/1M output
    const costUsd =
      usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006;

    // Log to DB
    if (user) {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        session_id: sessionId || null,
        type: "chat",
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cost_usd: costUsd,
        user_message: recentMessages[recentMessages.length - 1]?.content || "",
        ai_response: aiMessage,
      });
    }

    return NextResponse.json({
      message: aiMessage,
      usage,
      cost_usd: costUsd,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Interní chyba serveru. Zkus to prosím znovu." },
      { status: 500 }
    );
  }
}
