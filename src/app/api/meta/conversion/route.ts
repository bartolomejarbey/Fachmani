import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId, dealValue, contactEmail, contactPhone } = await request.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await supabaseAdmin
    .from("advisors")
    .select("id, meta_ad_account_id, meta_access_token_encrypted")
    .eq("user_id", user.id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Log the conversion event (actual Meta API sending will happen when account is connected)
  const eventData = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    user_data: {
      em: contactEmail ? [contactEmail] : [],
      ph: contactPhone ? [contactPhone] : [],
    },
    custom_data: {
      currency: "CZK",
      value: dealValue || 0,
    },
    action_source: "system_generated",
  };

  await supabaseAdmin.from("meta_conversion_logs").insert({
    advisor_id: advisor.id,
    deal_id: dealId,
    event_name: "Purchase",
    event_data: eventData,
    sent: false, // Will be true when Meta API integration is active
  });

  // If Meta account is connected, would send to Conversions API here
  // const pixelId = process.env.META_PIXEL_ID;
  // const accessToken = advisor.meta_access_token_encrypted;
  // if (pixelId && accessToken) { ... }

  return NextResponse.json({ ok: true, logged: true });
}
