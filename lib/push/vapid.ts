// S4.F4 — Web Push helper. Tenký wrapper okolo `web-push` knihovny.
//
// Konfigurace přes env:
//   VAPID_PUBLIC_KEY        (public — také jako NEXT_PUBLIC_VAPID_PUBLIC_KEY pro client)
//   VAPID_PRIVATE_KEY       (private)
//   VAPID_SUBJECT           (mailto: nebo URL — povinné dle spec, default mailto:noreply@fachmani.org)
//
// Generování klíčů: `npx web-push generate-vapid-keys` → vlož do .env.local + Vercel env.

import webpush, { type PushSubscription, type SendResult, type WebPushError } from "web-push";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@fachmani.org";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export type PushSendResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode?: number; expired: boolean; error: string };

export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!configure()) {
    return { ok: false, expired: false, error: "vapid_keys_missing" };
  }
  try {
    const result: SendResult = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, statusCode: result.statusCode };
  } catch (err) {
    const e = err as WebPushError;
    const status = e.statusCode;
    // 404 / 410 = subscription expired → caller by měl smazat record
    const expired = status === 404 || status === 410;
    return { ok: false, statusCode: status, expired, error: e.body?.toString() || e.message || "unknown" };
  }
}

export function getPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}
