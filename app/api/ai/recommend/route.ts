import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { conversationContext } = await request.json();

    if (!conversationContext) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    // Step 1: AI analyzes conversation and extracts category + location
    const analysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Analyzuj konverzaci a vrať ČISTÝ JSON ve formátu:
{
  "category_keywords": ["klíčová slova kategorie služby"],
  "location": "město nebo kraj nebo null",
  "urgency": "low|medium|high",
  "service_description": "krátký popis co uživatel potřebuje"
}

Kategorie může být: instalatér, elektrikář, malíř, zedník, truhlář, IT/web, marketing, úklid, stěhování, rekonstrukce, zahradník, automechanik, kosmetika, doučování, hlídání dětí, atd.`,
            },
            { role: "user", content: conversationContext },
          ],
          temperature: 0.3,
          max_tokens: 300,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!analysisResponse.ok) {
      console.error("OpenAI analysis error:", await analysisResponse.text());
      return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }

    const analysisData = await analysisResponse.json();
    let analysis;
    try {
      analysis = JSON.parse(analysisData.choices[0].message.content);
    } catch {
      analysis = {
        category_keywords: [],
        location: null,
        urgency: "medium",
        service_description: "",
      };
    }

    // Step 2: Query providers from DB
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    let query = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, location, is_verified")
      .eq("role", "provider")
      .eq("is_verified", true)
      .limit(10);

    // Filter by location if extracted
    if (analysis.location && analysis.location !== "null") {
      query = query.ilike("location", `%${analysis.location}%`);
    }

    const { data: providers, error } = await query;

    if (error) {
      console.error("DB query error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // If location filter returned nothing, retry without it
    let results = providers || [];
    if (results.length === 0 && analysis.location) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location, is_verified")
        .eq("role", "provider")
        .eq("is_verified", true)
        .limit(5);
      results = fallback || [];
    }

    // Track usage
    const { data: { user } } = await supabase.auth.getUser();
    const usage = analysisData.usage;
    if (user && usage) {
      const costUsd =
        usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006;
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        type: "recommend",
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cost_usd: costUsd,
      });
    }

    return NextResponse.json({
      analysis,
      recommendations: results.slice(0, 5),
    });
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
