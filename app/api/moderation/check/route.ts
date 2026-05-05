import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { moderateText } from "@/lib/moderation";

// POST { text: string, kind?: "request" | "feed" | "offer" }
// Vrací { flagged, categories, category_scores }
// Vyžaduje přihlášeného uživatele (proti zneužití na obecnou moderation API).

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  let body: { text?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const text = (body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Prázdný text" }, { status: 400 });
  if (text.length > 10_000) {
    return NextResponse.json({ error: "Text příliš dlouhý (max 10 000 znaků)" }, { status: 400 });
  }

  try {
    const result = await moderateText(text);
    return NextResponse.json({
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores,
    });
  } catch (err) {
    console.error("Moderation check error:", err);
    // Fail-open: pokud OpenAI selže, neblokujeme uživatele.
    // Místo toho dáme vědět adminu (a vrátíme flagged=false).
    return NextResponse.json({ flagged: false, error: "Moderation API nedostupné", failOpen: true });
  }
}
