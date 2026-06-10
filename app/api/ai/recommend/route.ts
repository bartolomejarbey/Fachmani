import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { isIosAppFromRequest } from "@/lib/native-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // App Store: generativní AI je v iOS aplikaci vypnutá (1.2 / 4.7 / 5.1.2).
    if (isIosAppFromRequest(request)) {
      return NextResponse.json({ error: "Tato funkce není v aplikaci dostupná." }, { status: 404 });
    }
    const { conversationContext } = await request.json();

    if (!conversationContext || typeof conversationContext !== 'string') {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    if (conversationContext.length > 5000) {
      return NextResponse.json({ error: "Context too long" }, { status: 400 });
    }

    // BEZPEČNOST: rate-limit proti amplifikaci nákladů na OpenAI (každé volání = 2 LLM dotazy).
    // Per-uživatel (přihlášený) nebo per-IP (anonym), hodinové okno. Service-role kvůli RLS.
    {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const cookieStore = await cookies();
      const authed = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
      );
      const { data: { user } } = await authed.auth.getUser();
      const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
      const ipKey = `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let q = admin.from("ai_usage").select("id", { count: "exact", head: true })
        .eq("type", "recommend").gte("created_at", hourAgo);
      q = user ? q.eq("user_id", user.id) : q.eq("session_id", ipKey);
      const { count } = await q;
      const limit = user ? 30 : 8;
      if ((count || 0) >= limit) {
        return NextResponse.json(
          { error: "Příliš mnoho požadavků. Zkuste to prosím za chvíli." },
          { status: 429 },
        );
      }
      await admin.from("ai_usage").insert({
        user_id: user?.id ?? null,
        session_id: user ? null : ipKey,
        type: "recommend",
      });
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
    const analysisUsage = analysisData.usage;

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
      .limit(5);

    // Search by keywords in bio/description — sanitize AI-generated keywords
    if (analysis.category_keywords && analysis.category_keywords.length > 0) {
      const safeKeywords = analysis.category_keywords
        .filter((kw: string) => typeof kw === 'string' && /^[\p{L}\p{N}\s\-]{2,50}$/u.test(kw))
        .slice(0, 5);
      if (safeKeywords.length > 0) {
        const keywordFilter = safeKeywords
          .map((kw: string) => `bio.ilike.%${kw}%`)
          .join(",");
        query = query.or(keywordFilter);
      }
    }

    // Filter by location if relevant
    if (analysis.location && analysis.location !== "null") {
      query = query.ilike("location", `%${analysis.location}%`);
    }

    const { data: providers, error } = await query;

    // Fallback: if nothing found with both filters, try keywords only
    const safeKeywordsFallback = (analysis.category_keywords || [])
      .filter((kw: string) => typeof kw === 'string' && /^[\p{L}\p{N}\s\-]{2,50}$/u.test(kw))
      .slice(0, 5);
    if ((!providers || providers.length === 0) && safeKeywordsFallback.length > 0) {
      const keywordFilter = safeKeywordsFallback
        .map((kw: string) => `bio.ilike.%${kw}%`)
        .join(",");

      const { data: fallbackProviders } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location, is_verified")
        .eq("role", "provider")
        .or(keywordFilter)
        .limit(5);

      // Fallback 2: if still nothing, try any verified providers
      if (!fallbackProviders || fallbackProviders.length === 0) {
        const { data: anyProviders } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, location, is_verified")
          .eq("role", "provider")
          .eq("is_verified", true)
          .limit(5);

        // Track usage
        await trackUsage(supabase, analysisUsage);

        return NextResponse.json({
          analysis,
          recommendations: anyProviders || [],
        });
      }

      // Track usage
      await trackUsage(supabase, analysisUsage);

      return NextResponse.json({
        analysis,
        recommendations: fallbackProviders,
      });
    }

    if (error) {
      console.error("DB query error:", error);
    }

    // Track usage
    await trackUsage(supabase, analysisUsage);

    return NextResponse.json({
      analysis,
      recommendations: providers || [],
    });
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function trackUsage(supabase: ReturnType<typeof createServerClient>, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined) {
  if (!usage) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const costUsd = usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006;
  await supabase.from("ai_usage").insert({
    user_id: user.id,
    type: "recommend",
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    cost_usd: costUsd,
  });
}
