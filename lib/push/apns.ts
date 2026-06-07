// iOS APNs sender — token-based (.p8) provider auth, HTTP/2.
//
// Konfigurace přes env (vytvoříš v Apple Developer → Keys → APNs):
//   APNS_KEY_ID        Key ID .p8 klíče (10 znaků)
//   APNS_TEAM_ID       Apple Developer Team ID (10 znaků)
//   APNS_BUNDLE_ID     app bundle id (org.fachmani.app) — apns-topic
//   APNS_PRIVATE_KEY   obsah .p8 souboru (PEM, EC P-256) — víceřádkový
//   APNS_ENVIRONMENT   'production' (default) nebo 'sandbox' (Xcode debug)
//
// Bez těchto env je sender no-op (isApnsConfigured() === false) — fan-out
// pak prostě APNs přeskočí a web push běží dál.

import crypto from "node:crypto";
import http2 from "node:http2";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function isApnsConfigured(): boolean {
  return !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_BUNDLE_ID &&
    process.env.APNS_PRIVATE_KEY
  );
}

// APNs provider JWT lze cachovat (Apple doporučuje refresh < 60 min, ne < 20 min).
let cachedToken: { jwt: string; iat: number } | null = null;

function providerToken(): string {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedToken && nowSec - cachedToken.iat < 30 * 60) {
    return cachedToken.jwt;
  }
  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  // env může mít \n escapované (Vercel) — normalizuj na reálné newliny
  const pem = process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: nowSec }));
  const signingInput = `${header}.${claims}`;

  const key = crypto.createPrivateKey(pem);
  // dsaEncoding 'ieee-p1363' → raw R||S (JOSE formát), ne DER
  const signature = crypto.sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  const jwt = `${signingInput}.${b64url(signature)}`;

  cachedToken = { jwt, iat: nowSec };
  return jwt;
}

export type ApnsPayload = {
  title: string;
  body: string;
  url?: string;
  badge?: number;
};

export type ApnsResult =
  | { ok: true }
  | { ok: false; status?: number; reason?: string; expired: boolean };

const HOSTS: Record<string, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

/**
 * Pošle jeden APNs push. `environment` přebíjí APNS_ENVIRONMENT
 * (token registrovaný Xcode debug buildem je sandbox).
 */
export async function sendApns(
  deviceToken: string,
  payload: ApnsPayload,
  environment?: "production" | "sandbox",
): Promise<ApnsResult> {
  if (!isApnsConfigured()) {
    return { ok: false, expired: false, reason: "apns_not_configured" };
  }
  const env = environment || (process.env.APNS_ENVIRONMENT as "production" | "sandbox") || "production";
  const host = HOSTS[env] || HOSTS.production;
  const bundleId = process.env.APNS_BUNDLE_ID!;

  let jwt: string;
  try {
    jwt = providerToken();
  } catch {
    return { ok: false, expired: false, reason: "jwt_sign_failed" };
  }

  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      ...(typeof payload.badge === "number" ? { badge: payload.badge } : {}),
    },
    ...(payload.url ? { url: payload.url } : {}),
  });

  return new Promise<ApnsResult>((resolve) => {
    let settled = false;
    const done = (r: ApnsResult) => {
      if (settled) return;
      settled = true;
      try { client.close(); } catch { /* noop */ }
      resolve(r);
    };

    const client = http2.connect(host);
    client.on("error", () => done({ ok: false, expired: false, reason: "connect_error" }));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      "authorization": `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });

    let status = 0;
    let respBody = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]) || 0;
    });
    req.setEncoding("utf8");
    req.on("data", (chunk) => { respBody += chunk; });
    req.on("error", () => done({ ok: false, expired: false, reason: "request_error" }));
    req.on("end", () => {
      if (status === 200) {
        done({ ok: true });
        return;
      }
      let reason = respBody;
      try { reason = JSON.parse(respBody).reason || respBody; } catch { /* keep raw */ }
      // 410 Gone nebo reason BadDeviceToken/Unregistered → token expirovaný, smazat
      const expired = status === 410 || reason === "BadDeviceToken" || reason === "Unregistered";
      done({ ok: false, status, reason, expired });
    });

    req.end(body);
    // Hard timeout aby cron nezamrzl
    setTimeout(() => done({ ok: false, expired: false, reason: "timeout" }), 8000);
  });
}
