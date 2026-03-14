import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      advisor_id,
      client_id,
      deal_id,
      title,
      description,
      start_time,
      end_time,
      location,
    } = body;

    // Validate required fields
    if (!advisor_id || !title || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Chybí povinná pole: advisor_id, title, start_time, end_time" },
        { status: 400 }
      );
    }

    // TODO: Google Calendar OAuth integration
    // 1. Fetch advisor's Google OAuth tokens from DB (e.g., advisors.google_refresh_token)
    // 2. If tokens exist, use googleapis to refresh access token
    //    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    //    oauth2Client.setCredentials({ refresh_token: advisor.google_refresh_token });
    // 3. Create event in Google Calendar
    //    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    //    const gcalEvent = await calendar.events.insert({
    //      calendarId: "primary",
    //      requestBody: {
    //        summary: title,
    //        description: description || "",
    //        start: { dateTime: start_time, timeZone: "Europe/Prague" },
    //        end: { dateTime: end_time, timeZone: "Europe/Prague" },
    //        location: location || "",
    //      },
    //    });
    // 4. Store gcalEvent.data.id as google_event_id on the appointment

    // Create appointment in Supabase
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        advisor_id,
        client_id: client_id || null,
        deal_id: deal_id || null,
        title,
        description: description || null,
        start_time,
        end_time,
        location: location || null,
        status: "scheduled",
        // TODO: google_event_id: gcalEvent?.data?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating appointment:", error);
      return NextResponse.json(
        { error: "Nepodařilo se vytvořit schůzku." },
        { status: 500 }
      );
    }

    // TODO: After Google Calendar sync is implemented:
    // - Update appointment with google_event_id
    // - Set up webhook/watch for calendar changes to keep in sync
    // - Handle sync conflicts (e.g., event modified in Google Calendar)

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("Calendar sync error:", err);
    return NextResponse.json(
      { error: "Interní chyba serveru." },
      { status: 500 }
    );
  }
}
