import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { client_id, message_text, platform } = body;

    if (!client_id || !message_text || !platform) {
      return NextResponse.json(
        { error: "Chybí povinné pole: client_id, message_text, platform" },
        { status: 400 }
      );
    }

    // Look up client to get advisor_id
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, advisor_id")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Klient nenalezen" },
        { status: 404 }
      );
    }

    // Save message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        advisor_id: client.advisor_id,
        client_id: client.id,
        platform,
        direction: "outgoing",
        message_text,
      })
      .select("id")
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: "Nepodařilo se uložit zprávu" },
        { status: 500 }
      );
    }

    // TODO: Here you would call the external bot webhook to actually send the message
    // Example structure for webhook call:
    //
    // const webhookUrl = process.env.EXTERNAL_BOT_WEBHOOK_URL;
    // if (webhookUrl) {
    //   await fetch(webhookUrl, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       client_id,
    //       platform,
    //       message_text,
    //       messenger_id: client.messenger_id,
    //       instagram_id: client.instagram_id,
    //       whatsapp_id: client.whatsapp_id,
    //     }),
    //   });
    // }

    return NextResponse.json({
      ok: true,
      message_id: message.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
