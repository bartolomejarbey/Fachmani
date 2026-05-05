// Newsletter digest email — středa + neděle, top nové poptávky pro fachmana
// (pokud je odběratel propojen s profilem, segmentujeme podle jeho kategorií a regionu).

export type DigestRequest = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_urgent: boolean | null;
};

export type DigestEmailInput = {
  recipientName?: string | null;
  requests: DigestRequest[];
  /** "středa" / "neděle" — informativní hint do subjectu */
  weekdayLabel?: string;
  siteUrl: string;
  unsubscribeUrl: string;
};

export type RenderedDigestEmail = {
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

function truncate(s: string | null | undefined, max = 200): string {
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function fmtBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${min.toLocaleString()} – ${max.toLocaleString()} Kč`;
  if (max != null) return `do ${max.toLocaleString()} Kč`;
  return `od ${min!.toLocaleString()} Kč`;
}

export function renderNewsletterDigest(input: DigestEmailInput): RenderedDigestEmail {
  const greetingName = input.recipientName?.trim() || "fachmane";
  const count = input.requests.length;
  const weekdayHint = input.weekdayLabel ? ` (${input.weekdayLabel})` : "";
  const subject = count === 0
    ? `Tento týden bylo zatím klidnější — Fachmani${weekdayHint}`
    : `${count} ${count === 1 ? "nová poptávka" : count < 5 ? "nové poptávky" : "nových poptávek"} pro vás${weekdayHint}`;

  const itemsHtml = input.requests
    .map((r) => {
      const meta: string[] = [];
      if (r.category_name) meta.push(`<span style="color:#0891b2;">${escapeHtml(r.category_name)}</span>`);
      if (r.location) meta.push(escapeHtml(r.location));
      const budget = fmtBudget(r.budget_min, r.budget_max);
      if (budget) meta.push(`<span style="color:#16a34a;">${budget}</span>`);
      if (r.is_urgent) meta.push(`<span style="color:#d97706;font-weight:600;">⚡ PRIORITNÍ</span>`);
      const metaHtml = meta.length
        ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${meta.join(" · ")}</div>`
        : "";
      const desc = truncate(r.description, 180);
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <a href="${escapeHtml(input.siteUrl)}/poptavka/${encodeURIComponent(r.id)}" style="text-decoration:none;color:#0f172a;">
          <div style="font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(r.title)}</div>
          ${metaHtml}
          ${desc ? `<div style="font-size:13px;line-height:1.55;color:#475569;margin-top:6px;">${escapeHtml(desc)}</div>` : ""}
        </a>
      </td></tr>`;
    })
    .join("");

  const emptyHtml = `<tr><td style="padding:18px 0;color:#64748b;font-size:14px;">
    Tento týden zatím nepřibyly poptávky odpovídající vašim kategoriím. Zkuste rozšířit oblast působení v profilu.
  </td></tr>`;

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
            <div style="font-size:14px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;">Fachmani — týdenní digest</div>
            <h1 style="margin:6px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;">Ahoj ${escapeHtml(greetingName)}</h1>
            <p style="margin:0;font-size:14px;color:#475569;">${count > 0 ? "Vybíráme to nejzajímavější z poptávek tohoto týdne ve vašich kategoriích a regionu." : "Tento týden je zatím klidněji."}</p>
          </td></tr>
          <tr><td style="padding:8px 28px 12px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${count > 0 ? itemsHtml : emptyHtml}
            </table>
          </td></tr>
          <tr><td style="padding:8px 28px 24px 28px;">
            <a href="${escapeHtml(input.siteUrl)}/poptavky" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Všechny poptávky →</a>
          </td></tr>
          <tr><td style="padding:0 28px 24px 28px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;">
              Tento mail jste obdrželi protože jste se přihlásili k odběru novinek z fachmani.org.
              <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#475569;text-decoration:underline;">Odhlásit odběr</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const lines = input.requests.map((r) => {
    const meta = [r.category_name, r.location, fmtBudget(r.budget_min, r.budget_max), r.is_urgent ? "PRIORITNÍ" : null]
      .filter(Boolean)
      .join(" · ");
    return `• ${r.title}${meta ? ` (${meta})` : ""}\n  ${input.siteUrl}/poptavka/${r.id}`;
  });

  const text = `Ahoj ${greetingName},

${count > 0 ? `tento týden ${count === 1 ? "přibyla" : "přibylo"} ${count} ${count === 1 ? "nová poptávka" : "poptávek"} ve vašich kategoriích:` : "tento týden zatím nepřibyly poptávky ve vašich kategoriích."}

${lines.join("\n\n")}

Všechny poptávky: ${input.siteUrl}/poptavky

---
Odhlásit odběr: ${input.unsubscribeUrl}
`;

  return { subject, html, text };
}
