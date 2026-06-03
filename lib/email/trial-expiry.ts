// Trial expiry / grace email pro fachmana
// 3 fáze:
//   - "warning"  — 7 dní před vypršením trial (T-7d)
//   - "grace"    — den, kdy trial vypršel a začalo 7-denní grace
//   - "blocked"  — grace skončila, hard-block

export type TrialEmailPhase = "warning" | "grace" | "blocked";

export type TrialEmailInput = {
  recipientName?: string | null;
  phase: TrialEmailPhase;
  trialEndsAt?: string | Date | null;
  graceEndsAt?: string | Date | null;
  upgradeUrl: string;
  unsubscribeUrl: string;
};

export type RenderedTrialEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}

const PHASE_COPY: Record<TrialEmailPhase, { subject: string; headline: string; body: string }> = {
  warning: {
    subject: "Vaše zkušební období na Fachmani končí za 7 dní",
    headline: "Zkušební období vám brzy vyprší",
    body:
      "Zkušební období končí za 7 dní. Pokud chcete dál reagovat na poptávky bez omezení, " +
      "přejděte na Premium ještě před jeho koncem — vyhnete se přerušení.",
  },
  grace: {
    subject: "Zkušební období vypršelo — máte 7 dní navíc",
    headline: "Zkušební období vypršelo, ale ještě máte 7 dní",
    body:
      "Zkušební období vypršelo. Aktivovali jsme 7denní ochrannou lhůtu — během této doby ještě " +
      "můžete reagovat na poptávky. Pro plný přístup bez přerušení přejděte na Premium.",
  },
  blocked: {
    subject: "Ochranná lhůta vypršela — pro pokračování aktivujte Premium",
    headline: "Zkušební období i ochranná lhůta vypršely",
    body:
      "Zkušební období i 7denní ochranná lhůta skončily. Pro reagování na poptávky musíte " +
      "aktivovat Premium. Váš profil zůstává viditelný, ale nemůžete posílat nabídky.",
  },
};

export function renderTrialEmail(input: TrialEmailInput): RenderedTrialEmail {
  const greetingName = input.recipientName?.trim() || "fachmane";
  const copy = PHASE_COPY[input.phase];
  const trialEnds = fmtDate(input.trialEndsAt);
  const graceEnds = fmtDate(input.graceEndsAt);
  const accent = input.phase === "warning" ? "#f59e0b" : input.phase === "grace" ? "#0891b2" : "#dc2626";

  const html = `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
          <tr><td style="padding:28px 28px 12px 28px;">
            <div style="font-size:14px;color:${accent};letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Fachmani</div>
            <h1 style="margin:6px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(copy.headline)}</h1>
            <p style="margin:0;font-size:14px;color:#475569;">Ahoj ${escapeHtml(greetingName)},</p>
          </td></tr>
          <tr><td style="padding:8px 28px 0 28px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(copy.body)}</p>
            ${trialEnds ? `<p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">Zkušební období ${input.phase === "warning" ? "končí" : "skončilo"}: <strong>${escapeHtml(trialEnds)}</strong></p>` : ""}
            ${input.phase === "grace" && graceEnds ? `<p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">Ochranná lhůta končí: <strong>${escapeHtml(graceEnds)}</strong></p>` : ""}
          </td></tr>
          <tr><td style="padding:20px 28px;">
            <a href="${escapeHtml(input.upgradeUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Aktivovat Premium →</a>
          </td></tr>
          <tr><td style="padding:0 28px 24px 28px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;">
              <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#475569;text-decoration:underline;">Spravovat notifikace</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Ahoj ${greetingName},

${copy.body}

${trialEnds ? `Trial ${input.phase === "warning" ? "končí" : "skončil"}: ${trialEnds}` : ""}
${input.phase === "grace" && graceEnds ? `Grace končí: ${graceEnds}` : ""}

Aktivovat Premium: ${input.upgradeUrl}

Spravovat notifikace: ${input.unsubscribeUrl}
`;

  return { subject: copy.subject, html, text };
}
