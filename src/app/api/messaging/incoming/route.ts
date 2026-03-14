import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const VALID_PLATFORMS = ["messenger", "instagram", "whatsapp"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const PLATFORM_ID_FIELD: Record<Platform, string> = {
  messenger: "messenger_id",
  instagram: "instagram_id",
  whatsapp: "whatsapp_id",
};

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const advisorKey = request.nextUrl.searchParams.get("advisor_key");
    if (!advisorKey) {
      return NextResponse.json(
        { error: "Chybí advisor_key parametr" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, sender_id, sender_name, message_text } = body;

    if (!platform || !sender_id || !sender_name || !message_text) {
      return NextResponse.json(
        { error: "Chybí povinné pole: platform, sender_id, sender_name, message_text" },
        { status: 400 }
      );
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: "Neplatná platforma. Povolené: messenger, instagram, whatsapp" },
        { status: 400 }
      );
    }

    // Validate advisor_key
    const { data: advisor, error: advisorError } = await supabase
      .from("advisors")
      .select("id")
      .eq("webhook_key", advisorKey)
      .single();

    if (advisorError || !advisor) {
      return NextResponse.json(
        { error: "Neplatný webhook klíč" },
        { status: 401 }
      );
    }

    const advisorId = advisor.id;
    const platformIdField = PLATFORM_ID_FIELD[platform as Platform];

    // Find or create client
    let clientId: string;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq(platformIdField, sender_id)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nameParts = sender_name.trim().split(/\s+/);
      const firstName = nameParts[0] || sender_name;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      const newClientData: Record<string, unknown> = {
        first_name: firstName,
        advisor_id: advisorId,
        [platformIdField]: sender_id,
      };

      if (lastName) {
        newClientData.last_name = lastName;
      }

      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert(newClientData)
        .select("id")
        .single();

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: "Nepodařilo se vytvořit klienta" },
          { status: 500 }
        );
      }

      clientId = newClient.id;
    }

    // Save message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        advisor_id: advisorId,
        client_id: clientId,
        platform,
        direction: "incoming",
        message_text,
        sender_name,
      })
      .select("id")
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: "Nepodařilo se uložit zprávu" },
        { status: 500 }
      );
    }

    // Create notification for advisor
    const truncatedDescription =
      message_text.length > 100
        ? message_text.substring(0, 100) + "..."
        : message_text;

    await supabase.from("reminders").insert({
      advisor_id: advisorId,
      client_id: clientId,
      title: `Nová zpráva od ${sender_name}`,
      description: truncatedDescription,
      due_date: new Date().toISOString(),
      is_completed: false,
    });

    return NextResponse.json({
      ok: true,
      client_id: clientId,
      message_id: message.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
