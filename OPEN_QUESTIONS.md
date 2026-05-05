# Open Questions

Open konfigurace / decision points, které blokují production funkčnost.

## Resend setup pro auth flow (a všechny transakční emaily)

**Stav:** Auth route i newsletter route používají `RESEND_FROM_EMAIL` env, fallback `Fachmani <noreply@fachmani.org>`.

**Akce před produkcí:**
1. V Resend dashboardu (https://resend.com/domains) přidat doménu **fachmani.org** (pokud ještě není).
   - Resend dá 3 DNS záznamy: DKIM cname, SPF txt, DMARC txt.
   - Nastavit u registrátora `fachmani.org` a počkat na status **Verified** (typicky < 60 min).
2. V Resend dashboardu (https://resend.com/api-keys) vytvořit API key (permission: `Sending access`).
3. Do `.env.local` (lokál) i Vercel env (prod) přidat:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   RESEND_FROM_EMAIL=Fachmani <noreply@fachmani.org>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000   # prod: https://www.fachmani.org
   ```
4. **Restart dev serveru** (env vars se načítají při startu, hot-reload je nezachytí).
5. Smoke test: registrace na již existující email → musí přijít "Pokus o registraci na Fachmani" mail.

**Když chybí key/doména:**
- Bez `RESEND_API_KEY` → `[register] RESEND_API_KEY missing — skipping account-exists email (STUB)`. Frontend zobrazí success, mail nepřijde.
- Bez verifikované domény → Resend vrátí 403/422, log `[register] Resend account-exists send failed`.

## Codebase-wide doménový rename (fachmani.cz → fachmani.org)

Doména je **fachmani.org**. Většina starého codebase má hardcoded `.cz` na různých místech. Při čištění zkontrolovat a sjednotit:
- `.env.local.example` — opraveno
- `app/sitemap.ts`, `app/robots.ts` — používají `NEXT_PUBLIC_SITE_URL`, OK pokud env správně
- `lib/seo.ts`, `lib/og.ts`, případné meta tagy
- `README`, dokumentace

```bash
# Audit:
grep -rn "fachmani\.cz" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.example" /Users/adstart_rota/Documents/fachmani | grep -v node_modules | grep -v ".next"
```
