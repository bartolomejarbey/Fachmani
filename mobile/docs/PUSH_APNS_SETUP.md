# iOS Push (APNs) — nastavení pro launch

Nativní push běží přes **token-based APNs (.p8 klíč)** a je napojený na stávající
fan-out cron (`/api/cron/push-fanout`), který posílá web push i APNs ze stejné
fronty (`notifications` tabulka). Bez APNs env proměnných je APNs část **no-op** —
web push běží dál, nic se nerozbije.

## Co je hotové v kódu

- `supabase/migrations/20260608010000_ios_device_tokens.sql` — tabulka `device_tokens` (+RLS). **Aplikováno na prod.**
- `lib/push/apns.ts` — APNs HTTP/2 sender, ES256 JWT podepsaný `node:crypto` (žádná extra závislost).
- `app/api/push/register-device/route.ts` — uložení APNs tokenu přihlášeného uživatele.
- `app/components/NativePushRegistrar.tsx` — v iOS aplikaci požádá o povolení, zaregistruje se a pošle token; mount v `app/layout.tsx`.
- `app/api/cron/push-fanout/route.ts` — rozšířeno o APNs vedle web push.
- `mobile/ios/App/App/App.entitlements` — `aps-environment = production`.

## Tvoje kroky (Apple Developer + Vercel)

### 1. Vytvoř APNs klíč (.p8)
1. https://developer.apple.com/account → **Certificates, IDs & Profiles → Keys → +**
2. Zaškrtni **Apple Push Notifications service (APNs)**, pojmenuj (např. „Fachmani APNs"), **Continue → Register**.
3. **Stáhni `.p8` soubor** (jde stáhnout jen jednou!). Poznamenej si **Key ID** (10 znaků).
4. **Team ID** najdeš vpravo nahoře v účtu (10 znaků).

### 2. Zapni Push capability v App ID
- App IDs → `org.fachmani.app` → zaškrtni **Push Notifications** → Save.
- V Xcode: target App → **Signing & Capabilities** → musí být **Push Notifications** (entitlements už je v repu).

### 3. Nastav Vercel env (projekt `fachmani-8uqn`)
```
APNS_KEY_ID        = <Key ID z kroku 1>
APNS_TEAM_ID       = <Team ID>
APNS_BUNDLE_ID     = org.fachmani.app
APNS_PRIVATE_KEY   = <celý obsah .p8 souboru, včetně -----BEGIN/END PRIVATE KEY----->
APNS_ENVIRONMENT   = production
```
> `APNS_PRIVATE_KEY` může mít newliny jako `\n` — sender je normalizuje. Vlož radši reálný víceřádkový obsah.

### 4. Cron už běží
Fan-out se spouští stávajícím cronem každých 5 min — jakmile jsou env nastavené,
začne posílat i APNs. Ověření: `GET /api/cron/push-fanout?secret=$CRON_SECRET` → v odpovědi `apnsSent`.

## Lokální testování (Xcode debug)
Debug build dává **sandbox** tokeny. Pro test:
- entitlements dočasně `aps-environment = development`,
- Vercel/`.env.local`: `APNS_ENVIRONMENT = sandbox`,
- po testu vrať obojí na `production` před Archive pro App Store.

## Tok dat
```
iOS app (NativePushRegistrar) → povolení + register()
  → APNs token → POST /api/push/register-device → device_tokens
nová notifikace (zpráva/nabídka) → notifications (push_sent_at NULL)
  → cron push-fanout → sendApns() → APNs → zařízení
tap na notifikaci → otevře notif.link v aplikaci
```
