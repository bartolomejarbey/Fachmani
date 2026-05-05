// Auto-match notifikace email — fachman dostane mail, když dorazila nová poptávka,
// kterou auto-matching vyhodnotil jako relevantní (kategorie + region match).

export type AutoMatchEmailInput = {
  /** Display jméno fachmana (může být null) */
  recipientName?: string | null;
  /** Title poptávky (zkracujeme na ~80 znaků na frontendu) */
  requestTitle: string;
  /** Description poptávky (volitelné, zkrátíme) */
  requestDescription?: string | null;
  /** Název kategorie (pokud znám) */
  categoryName?: string | null;
  /** Lokace, např. "Praha 5" nebo "Středočeský kraj" */
  location?: string | null;
  /** Absolutní URL na detail poptávky */
  requestUrl: string;
  /** Absolutní URL pro vypnutí notifikací */
  unsubscribeUrl: string;
};

export type RenderedAutoMatchEmail = {
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

function truncate(s: string | null | undefined, max = 280): string {
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

export function renderAutoMatchEmail(input: AutoMatchEmailInput): RenderedAutoMatchEmail {
  const greetingName = input.recipientName?.trim() || "fachmane";
  const subject = `Nová poptávka pro vás: ${truncate(input.requestTitle, 60)}`;
  const escapedTitle = escapeHtml(input.requestTitle);
  const escapedDesc = escapeHtml(truncate(input.requestDescription, 320));
  const meta: string[] = [];
  if (input.categoryName) meta.push(`<span style="color:#0891b2;">${escapeHtml(input.categoryName)}</span>`);
  if (input.location) meta.push(escapeHtml(input.location));
  const metaHtml = meta.length ? `<div style="font-size:13px;color:#64748b;margin-bottom:12px;">${meta.join(" · ")}</div>` : "";

  const html = `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
          <tr><td style="padding:28px 28px 12px 28px;">
            <div style="font-size:14px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;">Fachmani</div>
            <h1 style="margin:6px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;">Ahoj ${escapeHtml(greetingName)}, máš novou poptávku</h1>
            <p style="margin:0;font-size:14px;color:#475569;">Auto-matching ji vyhodnotil jako relevantní pro tvoji kategorii a kraj. Buď první kdo nabídne — to bývá rozhodující.</p>
          </td></tr>
          <tr><td style="padding:8px 28px 0 28px;">
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;background:#f8fafc;">
              <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:6px;">${escapedTitle}</div>
              ${metaHtml}
              ${escapedDesc ? `<div style="font-size:14px;line-height:1.6;color:#334155;">${escapedDesc}</div>` : ""}
            </div>
          </td></tr>
          <tr><td style="padding:20px 28px;">
            <a href="${escapeHtml(input.requestUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Otevřít poptávku →</a>
          </td></tr>
          <tr><td style="padding:0 28px 24px 28px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;">
              Tento mail jste dostal/a, protože máte v profilu zapnuté notifikace na shody (kategorie + kraj).
              <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#475569;text-decoration:underline;">Vypnout notifikace</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Ahoj ${greetingName},

máš novou poptávku odpovídající tvojí kategorii:

  ${input.requestTitle}
  ${[input.categoryName, input.location].filter(Boolean).join(" · ")}

${truncate(input.requestDescription, 320) || ""}

Detail: ${input.requestUrl}

Vypnout notifikace: ${input.unsubscribeUrl}
`;

  return { subject, html, text };
}
