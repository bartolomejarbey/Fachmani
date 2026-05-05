import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// B.F5 — admin odešle newsletter kampaň přes Resend.
// Pokud RESEND_API_KEY není nastaven, fallback na STUB mode (jen označí jako sent).
// Každý email má personalizovaný unsubscribe link (RFC 8058 List-Unsubscribe header).

const RESEND_API_URL = "https://api.resend.com/emails/batch";
const BATCH_SIZE = 100; // Resend batch limit
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fachmani.cz").replace(/\/$/, "");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Fachmani <noreply@fachmani.cz>";

type Subscriber = {
  id: string;
  email: string;
  unsubscribe_token: string | null;
};

function personalize(template: string, unsubscribeUrl: string): string {
  return template
    .replaceAll("{{unsubscribe_url}}", unsubscribeUrl)
    .replaceAll("{{unsubscribe_link}}", unsubscribeUrl);
}

function ensureUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  // CAN-SPAM / GDPR: každý email musí mít viditelný unsubscribe link.
  if (html.includes(unsubscribeUrl)) return html;
  const footer = `<hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
<p style="font-size:12px;color:#888;text-align:center">
  Tento email jste obdrželi protože jste se přihlásili k odběru novinek na fachmani.cz.<br>
  <a href="${unsubscribeUrl}" style="color:#888">Odhlásit odběr</a>
</p>`;
  return html + footer;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neoprávněno" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("admin_role")
    .eq("id", user.id)
    .single();
  if (!me?.admin_role) return NextResponse.json({ error: "Pouze admin" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { campaign_id?: string } | null;
  if (!body?.campaign_id) return NextResponse.json({ error: "Chybí campaign_id" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: campaign } = await admin
    .from("newsletter_campaigns")
    .select("id, status, subject, body_html, body_text")
    .eq("id", body.campaign_id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Kampaň nenalezena" }, { status: 404 });
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: `Kampaň už má status '${campaign.status}'` }, { status: 400 });
  }
  if (!campaign.subject || (!campaign.body_html && !campaign.body_text)) {
    return NextResponse.json({ error: "Kampaň nemá subject nebo body" }, { status: 400 });
  }

  // Načti všechny aktivní subscribers
  const { data: subscribers, error: subsErr } = await admin
    .from("newsletter_subscribers")
    .select("id, email, unsubscribe_token")
    .eq("is_active", true);

  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });
  const recipients = (subscribers ?? []) as Subscriber[];
  const recipientCount = recipients.length;

  // Označ jako "sending" abychom neměli race s druhým kliknutím
  await admin
    .from("newsletter_campaigns")
    .update({ status: "sending", recipient_count: recipientCount })
    .eq("id", body.campaign_id);

  const apiKey = process.env.RESEND_API_KEY;

  // STUB mode: bez API key jen označíme jako sent.
  if (!apiKey) {
    await admin
      .from("newsletter_campaigns")
      .update({
        status: "sent",
        sent_count: recipientCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", body.campaign_id);

    await admin.from("admin_activity_log").insert({
      admin_id: user.id,
      action: "newsletter_send",
      target_type: "newsletter_campaign",
      target_id: body.campaign_id,
      details: {
        subject: campaign.subject,
        recipient_count: recipientCount,
        stub: true,
        note: "RESEND_API_KEY není nastaven — STUB mode, emaily nebyly skutečně odeslány",
      },
    });

    return NextResponse.json({
      ok: true,
      recipient_count: recipientCount,
      sent_count: recipientCount,
      stub: true,
      note: "STUB: kampaň označena jako odeslaná. Pro reálné odesílání nastavte RESEND_API_KEY.",
    });
  }

  // Reálné odesílání přes Resend batch API.
  let sentCount = 0;
  let failedCount = 0;
  const failures: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const emails = batch.map((sub) => {
      const unsubscribeUrl = sub.unsubscribe_token
        ? `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
        : `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;

      const personalizedHtml = campaign.body_html
        ? ensureUnsubscribeFooter(personalize(campaign.body_html, unsubscribeUrl), unsubscribeUrl)
        : undefined;
      const personalizedText = campaign.body_text
        ? `${personalize(campaign.body_text, unsubscribeUrl)}\n\n---\nOdhlásit odběr: ${unsubscribeUrl}`
        : undefined;

      return {
        from: FROM_EMAIL,
        to: [sub.email],
        subject: campaign.subject,
        html: personalizedHtml,
        text: personalizedText,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(emails),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        failedCount += batch.length;
        failures.push(`Batch ${i / BATCH_SIZE}: ${res.status} ${errBody.slice(0, 200)}`);
      } else {
        sentCount += batch.length;
      }
    } catch (e) {
      failedCount += batch.length;
      failures.push(`Batch ${i / BATCH_SIZE} exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const finalStatus = failedCount === recipientCount ? "failed" : "sent";

  await admin
    .from("newsletter_campaigns")
    .update({
      status: finalStatus,
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
    })
    .eq("id", body.campaign_id);

  await admin.from("admin_activity_log").insert({
    admin_id: user.id,
    action: "newsletter_send",
    target_type: "newsletter_campaign",
    target_id: body.campaign_id,
    details: {
      subject: campaign.subject,
      recipient_count: recipientCount,
      sent_count: sentCount,
      failed_count: failedCount,
      failures: failures.slice(0, 5),
    },
  });

  return NextResponse.json({
    ok: failedCount < recipientCount,
    recipient_count: recipientCount,
    sent_count: sentCount,
    failed_count: failedCount,
    status: finalStatus,
    failures: failures.slice(0, 5),
  });
}
