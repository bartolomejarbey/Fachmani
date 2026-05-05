// S4.F3 — SMS provider abstrakce.
// Konfigurace přes env:
//   SMS_PROVIDER=smsbrana|twilio (default: stub)
//
//   pro SMSbrana:
//     SMSBRANA_API_USER
//     SMSBRANA_API_PASSWORD (md5 hex by SMSbrana spec, viz https://www.smsbrana.cz/)
//
//   pro Twilio:
//     TWILIO_ACCOUNT_SID
//     TWILIO_AUTH_TOKEN
//     TWILIO_FROM_NUMBER (např. "+420...")
//
// Pokud žádný provider není nakonfigurován → stub mode: nic se neodešle,
// log se zapíše s status='stub'. Endpoint volající dostane { ok: false, reason: 'no_provider' }.

export type SmsSendInput = {
  phone: string;
  body: string;
};

export type SmsSendResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; reason: string; provider?: string };

function normalizeCzPhone(input: string): string {
  // SMSbrana akceptuje "420..." nebo "+420...". Twilio chce +420....
  const cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("420")) return `+${cleaned}`;
  if (cleaned.length === 9) return `+420${cleaned}`;
  return cleaned;
}

async function sendViaSmsBrana(input: SmsSendInput): Promise<SmsSendResult> {
  const user = process.env.SMSBRANA_API_USER;
  const password = process.env.SMSBRANA_API_PASSWORD;
  if (!user || !password) return { ok: false, reason: "smsbrana_credentials_missing" };
  const number = normalizeCzPhone(input.phone).replace(/^\+/, "");
  const params = new URLSearchParams({
    action: "send_sms",
    login: user,
    password: password,
    number,
    message: input.body,
  });
  try {
    const res = await fetch(`https://api.smsbrana.cz/smsconnect/http.php?${params.toString()}`);
    const text = await res.text();
    if (!res.ok || !/<err>0<\/err>/i.test(text)) {
      return { ok: false, reason: `smsbrana_http_${res.status}_${text.slice(0, 80)}`, provider: "smsbrana" };
    }
    return { ok: true, provider: "smsbrana" };
  } catch (e) {
    return { ok: false, reason: `smsbrana_exception_${e instanceof Error ? e.message : String(e)}`, provider: "smsbrana" };
  }
}

async function sendViaTwilio(input: SmsSendInput): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { ok: false, reason: "twilio_credentials_missing" };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    To: normalizeCzPhone(input.phone),
    From: from,
    Body: input.body,
  });
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, reason: `twilio_http_${res.status}_${data.message ?? ""}`.slice(0, 200), provider: "twilio" };
    return { ok: true, provider: "twilio", messageId: data.sid };
  } catch (e) {
    return { ok: false, reason: `twilio_exception_${e instanceof Error ? e.message : String(e)}`, provider: "twilio" };
  }
}

export async function sendSms(input: SmsSendInput): Promise<SmsSendResult> {
  const provider = (process.env.SMS_PROVIDER || "").toLowerCase();
  if (provider === "smsbrana") return sendViaSmsBrana(input);
  if (provider === "twilio") return sendViaTwilio(input);
  return { ok: false, reason: "no_provider_configured" };
}
