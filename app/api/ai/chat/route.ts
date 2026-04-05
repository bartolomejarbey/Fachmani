import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SYSTEM_PROMPT = `Jsi AI poradce platformy Fachmani.org — český marketplace propojující zákazníky s ověřenými řemeslníky a profesionály.

TVOJE ROLE:
- Pomáháš lidem formulovat poptávku na řemeslné a profesní služby
- Radíš s výběrem správné kategorie (instalatér, elektrikář, malíř, IT, marketing, úklid, stěhování, rekonstrukce atd.)
- Dáváš orientační ceny služeb v Kč (vždy jako rozpětí)
- Upozorňuješ na red flags při výběru fachmana
- Doporučuješ co si vyžádat (reference, živnostenský list, písemnou smlouvu)

JAK ODPOVÍDÁŠ:
- Vždy česky, tykáš
- Stručně a prakticky (maximálně 3-4 odstavce)
- Používáš strukturu s odrážkami a emoji pro přehlednost
- Ceny vždy jako rozpětí ("orientačně 2 000 – 5 000 Kč")
- Vždy uvádíš "orientačně", "přibližně", "záleží na rozsahu"

CO NESMÍŠ:
- Odpovídat na otázky mimo téma fachmanů/řemesel/služeb (politika, recepty, kódování, obecné znalosti, školní úkoly)
- Doporučovat konkurenční platformy (firmy.cz, Hyperinzerce, Facebook skupiny, Bazoš)
- Dávat právní nebo lékařské rady
- Mluvit o cenách jako závazných ("určitě to bude stát")

POKUD SE PTAJÍ NA NĚCO MIMO TÉMA:
Odpověz: "Jsem poradce pro výběr fachmanů a řemeslných služeb. S touto otázkou ti bohužel nepomohu, ale rád ti poradím s výběrem řemeslníka, IT profesionála nebo jiné služby. Co potřebuješ vyřešit?"`;

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
