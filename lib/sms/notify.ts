// S4.F3 — high-level SMS notification helpers.
// Zapsání do sms_log se vždy provede (i ve stub módu), aby admin
// viděl co by se bylo odeslalo a co skutečně odešlo.

import { createClient } from "@supabase/supabase-js";
import { sendSms } from "./provider";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SmsNotifyInput = {
  userId: string;
  phone: string;
  body: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

export type SmsNotifyResult = {
  ok: boolean;
  status: "sent" | "failed" | "stub";
  provider?: string;
  reason?: string;
  log_id?: string;
};

export async function notifySms(input: SmsNotifyInput): Promise<SmsNotifyResult> {
  const sb = getServiceClient();

  // Truncate body na 160 chars (jeden SMS segment) — provideři jinak účtují víc
  const body = input.body.length > 160 ? input.body.slice(0, 157) + "..." : input.body;
  const result = await sendSms({ phone: input.phone, body });

  const status: "sent" | "failed" | "stub" =
    result.ok
      ? "sent"
      : result.reason?.endsWith("_credentials_missing") || result.reason === "no_provider_configured"
        ? "stub"
        : "failed";

  let log_id: string | undefined;
  if (sb) {
    const { data } = await sb
      .from("sms_log")
      .insert({
        user_id: input.userId,
        phone: input.phone,
        body,
        type: input.type,
        related_entity_type: input.relatedEntityType,
        related_entity_id: input.relatedEntityId,
        provider: result.ok ? result.provider : undefined,
        provider_message_id: result.ok ? result.messageId : undefined,
        status,
        error: result.ok ? null : result.reason,
      })
      .select("id")
      .single();
    log_id = (data as { id?: string } | null)?.id;
  }

  return {
    ok: result.ok,
    status,
    provider: result.ok ? result.provider : undefined,
    reason: result.ok ? undefined : result.reason,
    log_id,
  };
}
