import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await supabase.from("error_logs").insert({
      error_type: body.error_type || "unknown",
      message: body.message?.slice(0, 1000) || "",
      stack_trace: body.stack_trace?.slice(0, 5000) || null,
      user_id: body.user_id || null,
      user_role: body.user_role || null,
      url: body.url?.slice(0, 500) || null,
      severity: body.severity || "medium",
      metadata: body.metadata || {},
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
