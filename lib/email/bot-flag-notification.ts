// Bot flag notification email — posíláme owner / admin rolím, když se v DB
// objevil reply, který fachmani-bot nedovedl klasifikovat. Cron tahá pending flagy
// se notified_at IS NULL a označí je jako notifikované, aby šel mail jen jednou.

export type BotFlagSummary = {
  id: string;
  reply_author_name: string | null;
  reply_text: string | null;
  flag_reason: string | null;
  ai_suggestion: string | null;
  created_at: string;
  fb_comment_url: string | null;
};

export type BotFlagEmailInput = {
  flags: BotFlagSummary[];
  /** Absolutní URL na /admin/bot-flags */
  adminUrl: string;
};

export type RenderedBotFlagEmail = {
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

function truncate(s: string | null, max = 220): string {
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderBotFlagEmail(input: BotFlagEmailInput): RenderedBotFlagEmail {
  const n = input.flags.length;
  const subject =
    n === 1
      ? "🤖 1 nový bot flag čeká na review"
      : `🤖 ${n} nových bot flag-ů čeká na review`;

  const itemsHtml = input.flags
    .map((f) => {
      const author = escapeHtml(f.reply_author_name || "Neznámý autor");
      const reason = f.flag_reason ? `<span style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#92400e;background:#fef3c7;padding:2px 6px;border-radius:4px;">${escapeHtml(f.flag_reason)}</span>` : "";
      const reply = escapeHtml(truncate(f.reply_text));
      const ai = escapeHtml(truncate(f.ai_suggestion, 180));
      const when = escapeHtml(fmtDateTime(f.created_at));
      const fb = f.fb_comment_url
        ? `<a href="${escapeHtml(f.fb_comment_url)}" style="color:#0891b2;text-decoration:underline;font-size:12px;">FB komentář ↗</a>`
        : "";
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:4px;">${author} <span style="color:#64748b;font-weight:400;">· ${when}</span></div>
            ${reason ? `<div style="margin-bottom:8px;">${reason}</div>` : ""}
            <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${reply || "<em style='color:#94a3b8'>(bez textu)</em>"}</div>
            ${ai ? `<div style="font-size:12px;color:#475569;background:#f1f5f9;padding:8px 10px;border-radius:6px;margin-bottom:6px;"><strong>AI návrh:</strong> ${ai}</div>` : ""}
            ${fb}
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:24px 24px 16px 24px;">
                <div style="font-size:14px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;">Fachmani Admin</div>
                <h1 style="margin:6px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(subject)}</h1>
                <p style="margin:0;font-size:14px;color:#475569;">FIFO fronta čeká na lidský zásah. Stačí kliknout, upravit AI návrh a odeslat (nebo Ignore / Ukončit konverzaci).</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;">Otevřít fronty flagů →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e2e8f0;">
                  ${itemsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f8fafc;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Automatická notifikace · Bude zaslána jen jednou na flag (notified_at).
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `${subject}\n\n` +
    input.flags
      .map((f) => {
        const lines: string[] = [];
        lines.push(`— ${f.reply_author_name || "Neznámý autor"} · ${fmtDateTime(f.created_at)}`);
        if (f.flag_reason) lines.push(`  reason: ${f.flag_reason}`);
        if (f.reply_text) lines.push(`  reply: ${truncate(f.reply_text, 200)}`);
        if (f.ai_suggestion) lines.push(`  ai návrh: ${truncate(f.ai_suggestion, 200)}`);
        if (f.fb_comment_url) lines.push(`  fb: ${f.fb_comment_url}`);
        return lines.join("\n");
      })
      .join("\n\n") +
    `\n\nReview fronty: ${input.adminUrl}\n`;

  return { subject, html, text };
}
