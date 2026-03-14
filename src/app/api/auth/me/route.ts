import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // 1. Get the current user from the session (using SSR client with cookies)
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Může selhat v Server Components, ale v Route Handlers funguje
          }
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  // 2. Detect role using service_role (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sa } = await supabaseAdmin
    .from("superadmins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (sa) return NextResponse.json({ role: "superadmin" });

  const { data: cli } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (cli) return NextResponse.json({ role: "client" });

  const { data: adv } = await supabaseAdmin
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (adv) return NextResponse.json({ role: "advisor" });

  return NextResponse.json({ role: null });
}
