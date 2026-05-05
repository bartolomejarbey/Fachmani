// "Account exists" email pro registrační flow.
// Posíláme, když někdo zkusí registrovat email, který už v auth.users existuje.
// Cíl: informovat uživatele bez prozrazení existence účtu na frontendu (anti-enumeration).

export type AccountExistsInput = {
  /** Display name z user_metadata.full_name (může chybět). */
  name?: string | null;
  /** Absolutní URL na /auth/login. */
  loginUrl: string;
  /** Absolutní URL na /auth/forgot-password (nebo Supabase reset link). */
  resetUrl: string;
};

export type RenderedEmail = {
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

export function renderAccountExistsEmail(input: AccountExistsInput): RenderedEmail {
  const greetingName = input.name?.trim() || "uživateli";
  const subject = "Pokus o registraci na Fachmani";

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
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 32px 16px 32px;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Fachmani</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 16px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#0f172a;">Pokus o registraci</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Ahoj ${escapeHtml(greetingName)},<br><br>
                  právě někdo (pravděpodobně ty) se pokusil zaregistrovat na <strong>Fachmani</strong> s touto emailovou adresou. Účet s tímto emailem ale už existuje.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Pokud sis chtěl/a vytvořit nový účet, nemusíš — stačí se přihlásit:
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding:0 0 12px 0;">
                      <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Přihlásit se</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;color:#475569;text-decoration:underline;font-size:14px;padding:8px 16px;">Zapomněl/a jsi heslo? Obnovit přístup</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px;">
                  Pokud to nebyl/a jsi ty, nic neděláš — tvůj účet je v bezpečí. Tento email můžeš ignorovat. Heslo k tvému účtu nikdy nikomu neprozrazujeme a nikdo se k němu nedostal.
                </p>
                <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  <strong>P.S.</strong> Pokud sis registraci nepamatuješ, pravděpodobně sis účet vytvořil/a dříve. Použij &bdquo;Zapomenuté heslo&ldquo; pro obnovení přístupu.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#f8fafc;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Fachmani — najdi řemeslníka, kterému budeš věřit.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Pokus o registraci na Fachmani

Ahoj ${greetingName},

právě někdo (pravděpodobně ty) se pokusil zaregistrovat na Fachmani s touto emailovou adresou. Účet s tímto emailem ale už existuje.

Pokud sis chtěl/a vytvořit nový účet, nemusíš — stačí se přihlásit:
${input.loginUrl}

Zapomněl/a jsi heslo? Obnov přístup zde:
${input.resetUrl}

Pokud to nebyl/a jsi ty, nic neděláš — tvůj účet je v bezpečí. Tento email můžeš ignorovat.

P.S. Pokud sis registraci nepamatuješ, pravděpodobně sis účet vytvořil/a dříve. Použij "Zapomenuté heslo" pro obnovení přístupu.

—
Fachmani
`;

  return { subject, html, text };
}
