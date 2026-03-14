import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Chybí clientId parametr" },
        { status: 400 }
      );
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Nepodařilo se načíst zprávy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json(
      { error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
