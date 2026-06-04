# Fachmani iOS — App Store Compliance & Build Spec

> Cíl: schválení v App Store na **první pokus**.
> Rozsah: iOS aplikace = Capacitor (WKWebView) obal nad `https://fachmani.org` + nutná nativní vrstva.
> Datum: 2026-06-04. Verze: 1.0.
>
> **Zlaté pravidlo dokumentu:** Všechna omezení níže platí **JEN pro iOS app build**. Webová verze na `fachmani.org` (Safari) zůstává beze změny — Comgate, web push i ceny v Kč tam fungují dál. Rozdíl se řídí runtime detekcí `Capacitor.getPlatform() === 'ios'`.

---

## 1. Shrnutí strategie

### 1.1 Architektura
- **Capacitor 8** shell (`mobile/package.json` už má `@capacitor/cli|core|ios ^8.4.0`, `node_modules` nainstalované). **Chybí** `capacitor.config.ts` i `ios/` projekt — nutno scaffoldnout (`npx cap add ios`).
- **Hybridní web load**, ne čistě remote: lokální shell + remote data. Čistě `server.url` na fachmani.org zvyšuje riziko 4.2 a rozbíjí offline start (4.2.3). Lokální skořápka (splash, offline obrazovka, tab bar) + WebView pro obsah.
- **Detekce platformy** je páteří celé compliance: na iOS přepínáme monetizaci na IAP, vypínáme web push (VAPID), vypínáme Comgate tlačítka.

### 1.2 Nutné nativní funkce (aby app nebyla „web wrapper" dle 4.2)
Implementovat minimálně **4 reálné** nativní funkce (ne kosmetiku):
1. **Nativní push (APNs)** přes `@capacitor/push-notifications` — náhrada nefunkčního VAPID web push.
2. **Nativní kamera/galerie** přes `@capacitor/camera` (PHPicker, out-of-process) pro foto poptávek/profilu.
3. **Nativní offline stav** přes `@capacitor/network` + vlastní retry obrazovka (reviewer aktivně testuje vypnutím sítě).
4. **Nativní navigace / chrome**: spodní tab bar nebo perzistentní nativní chrome, splash (`@capacitor/splash-screen`), status bar styling, haptika (`@capacitor/haptics`), app badge pro nepřečtené.

Sign in with Apple **NENÍ povinné** (viz sekce 2.6) — jen volitelný UX bonus.

### 1.3 Monetizace kvůli IAP (jádro rizika)
Fachmani má 4 monetizované prvky. **3 jsou čistě digitální → IAP-only na iOS:**

| Prvek | Cena (web) | Co odemyká | iOS řešení | Guideline |
|---|---|---|---|---|
| Premium/Business předplatné | 499 Kč/měs | neomezené nabídky, více kategorií, zvýraznění | **Auto-renewable IAP** | 3.1.1, 3.1.2 |
| Peněženka / kredity | dobití přes Comgate | in-app měna | **Consumable IAP** (balíčky) | 3.1.1 |
| Spend kreditů: `offer_publish` 29 Kč, `profile_boost_7d` 99 Kč, `feed_boost_1d` 49 Kč, `urgent_request` 100 Kč, `extra_request` 50 Kč | z peněženky | odemčení funkcí + boosty | spend z IAP-kreditů server-side (OK) | 3.1.1, **3.1.3(g)** |
| **Řemeslná práce fachmana** | platí se offline přímo fachmanovi | fyzická služba mimo app | **ne-IAP, dnes v app neplaceno** | 3.1.3(e) |

- `profile_boost_7d` + `feed_boost_1d` jsou **doslova** „boosts for posts in a social media app" z 3.1.3(g) → IAP, žádná diskuse.
- „Marketplace/lead-gen výjimka" Fachmani **NEZACHRÁNÍ** — monetizace není provize z fyzické práce, ale prodej digitálních funkcí.
- **EU External Purchase Link Entitlement**: existuje (CZ/EEA storefront), ale pro **první pokus NEPOUŽÍVAT** — nesmí běžet souběžně s IAP, vyžaduje vlastní StoreKit integraci + entitlement + reporting + Apple fee (5% Core Technology Commission od 1.1.2026 + 2% Initial Acquisition Fee). Vyšší riziko. **Volíme čisté IAP.**
- Doporučená StoreKit knihovna: **RevenueCat** (server-side validace + webhooky) nebo `@capacitor-community/in-app-purchases`.

### 1.4 Tři jisté blokery v současném stavu (ověřeno v kódu)
1. **3.1.1** — `app/dashboard/fachman/penezenka/page.tsx` přesměrovává do Comgate (`router.push(data.redirectUrl)` ř. 95 a 119), text „Platba přes ComGate" (ř. 238), „Aktivovat Premium 499 Kč/měsíc" (ř. 295). Ve WKWebView = jistý reject.
2. **5.1.1(v)** — in-app smazání účtu **NEEXISTUJE** (grep `deleteUser`/`account/delete`/`smazat účet` = 0 výsledků). Registrace přes Supabase existuje → in-app delete povinný.
3. **1.2** — chybí **blokování uživatelů** (žádná tabulka `user_blocks`) a **hlášení** u recenzí/DM/profilů (existuje jen u feedu).

---

## 2. Sekce per oblast

### 2.1 — IAP: předplatné + kredity vs fyzické služby (3.1.1, 3.1.2, 3.1.3) `BLOKER`

**Pravidlo.**
- 3.1.1: Odemykání funkcí/obsahu/in-app měny (= **kredity**) v aplikaci MUSÍ použít Apple IAP. Zakázané jsou vlastní platební brány (Comgate) pro digitální funkce. Kredity z IAP **nesmí expirovat** + musí mít **restore** mechanismus.
- 3.1.2: Auto-renewable subscription — min. perioda funkční, dostupnost na všech zařízeních uživatele, trvalá hodnota. **Disclosure povinnosti** (délka termínu, co se poskytuje, účtovaná částka, jak zrušit) přímo u nákupu.
- 3.1.3 (anti-steering): Uvnitř app NESMÍ být navádění na jiný způsob platby za digitální funkce (žádné „499 Kč", odkazy, CTA na Comgate) bez schválené entitlement.
- 3.1.3(e): Fyzické zboží/služby konzumované **mimo** app = NESMÍ jít přes IAP (jiná metoda, Apple Pay/karta).
- 3.1.3(g): „boosts for posts in a social media app" = IAP-only.

**Riziko pro Fachmani.** JISTÉ ZAMÍTNUTÍ. Vstupní bod do plateb je `penezenka/page.tsx` → `/api/payments/topup` a `/api/payments/premium` → Comgate redirect. `predplatne/page.tsx` jen simuluje upgrade přímým `UPDATE subscription_type` (ř. 72-78) **bez platby** — to je samostatný bug (reviewer by „získal" Premium zdarma) i anti-steering/3.1.1 problém. Disclosure věta „Předplatné se automaticky obnovuje. Zrušit lze kdykoliv." (ř. 299) je pro 3.1.2 **nedostatečná**.

**POVINNÉ akce.**
1. Platformní guard: na iOS skrýt všechna tlačítka volající `/api/payments/*` a Comgate redirecty; nahradit StoreKit purchase.
2. Premium = auto-renewable subscription (Subscription Group v ASC). Ceny nastavit **v ASC** (Apple price tiers), NE hardcoded 499 Kč z DB. Akceptovat, že Apple cena bude jiná (Apple 15-30% / EEA CTC).
3. Kredity = consumable IAP balíčky. **Zůstatek držet server-side** (tabulka `wallets` existuje) navázaný na účet → po reinstalaci/na jiném zařízení kredity „nepropadnou" = naplnění ducha „may not expire". Consumables se klasicky nerestorují, server-side balance to řeší. Připisovat **až po server-side verifikaci** StoreKit transakce (analogie dnešního `app/api/payments/webhook` s `verifyComgatePayment`).
4. Spend kreditů (`/api/wallet/spend`) zůstává server-side, beze změny — utrácení IAP-koupených kreditů uvnitř app je OK. Když nemá dost → nabídnout IAP dobití, NE odkaz na web.
5. Odstranit `predplatne/page.tsx` simulaci (přímý DB UPDATE) — na iOS nahradit IAP, na webu napojit na reálnou Comgate platbu (mimo rozsah iOS, ale je to bug).
6. Disclosure u nákupu (3.1.2): viz 2.7.
7. App Review Notes: testovací účet (fachman) s IAP flow + věta, že řemeslo se platí offline mimo app.
8. Comgate recurring (`initRecurring: true` v premium route + webhook) v iOS buildu **vypnout** — auto-renew řeší StoreKit.

**Config / kód.**
```ts
// platform guard – centrální helper
import { Capacitor } from '@capacitor/core';
export const isIOSNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

// penezenka/page.tsx – handleTopup / handlePremium
if (isIOSNative()) {
  await purchaseViaStoreKit(productId);   // RevenueCat / IAP plugin
  return;                                  // NIKDY router.push(redirectUrl)
}
// web: stávající Comgate cesta beze změny
```
- App Store Connect: Subscription Group `Fachmani Premium`; produkty `org.fachmani.premium.monthly` (auto-renew); kredity `org.fachmani.credits.500/1000/2000/5000` (consumable); App-specific Shared Secret pro server-side receipt validaci.
- **Restore Purchases** tlačítko povinné (v Nastavení/peněžence) pro 3.1.1.
- Xcode: zapnout **In-App Purchase** capability; `.storekit` configuration file pro lokální testování.

---

### 2.2 — 4.2 Minimum Functionality (web wrapper) `BLOKER`

**Pravidlo.**
- 4.2: app musí mít features/content/UI nad rámec „repackaged website"; jinak nepatří do App Store.
- 4.2.2: nesmí být primárně web clipping / content aggregator / collection of links.
- 4.2.3: musí fungovat samostatně (i) bez jiné app, (ii) disclose download při startu, nesmí selhat bez sítě.
- **4.2.6** (doplněno): template/app-generation services — app musí submitovat **přímo provider obsahu**, ne agentura/generátor. Reviewer u tenkého wrapperu kombinuje 4.2 + 4.2.6 + 4.3(b).
- HIG: žádný viditelný Safari chrome / URL bar / progress bar; nativní splash; offline stav; perzistentní login.

**Riziko pro Fachmani.** Archetyp 4.2 zamítnutí: marketplace (poptávky + nabídky + feed + recenze) = snadno označitelný jako „content aggregator". VAPID web push v WKWebView nefunguje → klíčová funkce mrtvá → app vypadá jako osekaný web. Bez nativní navigace/splash/offline reviewer po vypnutí sítě uvidí Safari chybu = okamžitý flag.

**POVINNÉ akce.** Implementovat nativní trio+ (push APNs, kamera, offline, nativní chrome/haptika) — viz 1.2. Bundlovat shell lokálně. Připravit „native value" demo pro reviewera (App Review notes: výčet nativních funkcí + screenshoty/video). V notes explicitně: „Aplikaci submituje přímo provozovatel obsahu (Fachmani / IČO 24872849), nejde o generovanou/template app." (4.2.6).

**Verzování (doplněno).** Před scaffoldem ověřit, že Capacitor major `^8.4.0` je kompatibilní s aktuálně vyžadovaným **Xcode/iOS SDK** v době submitu (Apple periodicky zvedá minimum). Nastavit rozumný **iOS deployment target** (např. iOS 15+).

**Config / kód.** Viz BUILD SPEC (sekce 4) — `capacitor.config.ts`, splash, offline listener.

---

### 2.3 — 5.1.1(v) Smazání účtu v aplikaci `BLOKER`

**Pravidlo.** App s vytvářením účtu MUSÍ nabídnout **smazání účtu přímo v aplikaci** (ne deaktivaci, ne jen e-mail na podporu). Smazat celý záznam + osobní data vč. **UGC sdíleného s ostatními** (recenze, příspěvky, komentáře). Snadno k nalezení (1-2 kliknutí od profilu). Pro VŠECHNY uživatele bez ohledu na lokalitu. Lze vyžadovat re-auth + potvrzení. Smí se ponechat jen **právně povinná** data (účetní doklady) — ostatní mazat (anonymizovat). Fachmani NENÍ regulované odvětví → support-only flow **zakázán**. Druhá věta 5.1.1(v) (doplněno): bez významných account-based funkcí umožni používání bez loginu → ověřit, že app nemá login-wall.

**Riziko pro Fachmani.** In-app smazání **NEEXISTUJE** (ověřeno grep = 0). Jediné zmínky „zrušit účet" jsou ve VOP jako právo *provozovatele* — to 5.1.1(v) NESPLŇUJE. UGC sdílený (`reviews`, `customer_reviews`, `posts`, `post_comments`, `offers`, `requests`, `messages`) musí jít smazat, ne jen řádek v `profiles`.

**POVINNÉ akce.**
1. Do `app/dashboard/profil/page.tsx`, sekce „Nastavení účtu" → červené tlačítko „Trvale smazat účet".
2. 2-krokové potvrzení: (1) modal s výčtem co se smaže, (2) re-auth heslem (`signInWithPassword`) nebo kódem z e-mailu.
3. Server route `app/api/account/delete/route.ts` (`runtime = 'nodejs'`, service-role): ověřit session → smazat/anonymizovat napříč tabulkami → `admin.auth.admin.deleteUser(userId)`.
4. Účetní data (`payments`, `invoices`, `transactions`, `wallet_transactions`, `premium_subscriptions`) **anonymizovat** (odpojit `user_id`, smazat PII), ne mazat.
5. Po dokončení potvrzovací e-mail (existující Resend) + odhlásit + redirect.
6. **Bez** hlášky o Apple subscription (Fachmani nemá Apple IAP v okamžiku psaní tohoto auditu pro web; po zavedení IAP na iOS zvážit, ale neplést reviewera).
7. Ověřit **bez login-wallu**: homepage/`/poptavky`/feed procházet bez přihlášení (v kódu guard nenalezen — **fyzicky otestovat na iOS buildu**).

**Config / kód.**
```ts
// app/api/account/delete/route.ts
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  // 1) ověř session (anon klient z cookies) -> userId
  // 2) re-auth heslem nebo e-mail kódem
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // 3) DELETE v pořadí dle FK:
  //   post_comments, post_likes, reviews, posts, offers, requests,
  //   messages, push_subscriptions, provider_categories, provider_profiles
  // 4) ANONYMIZE účetní: payments/invoices/transactions/wallet_transactions/premium_subscriptions
  //       .update({ user_id: null, email: null }).eq('user_id', userId)
  // 5) profiles delete; auth.admin.deleteUser(userId)
  // 6) Resend potvrzovací e-mail; return 200
}
```
- Doporučeno: FK `ON DELETE CASCADE` k `auth.users(id)` pro atomicitu.
- Capacitor: žádný Info.plist klíč; flow běží ve WKWebView. Deep-link mířit na `/dashboard/profil#smazat-ucet`, **NE** otevírat Safari na homepage (4.0).
- Service-role klíč už existuje (`SUPABASE_SERVICE_ROLE_KEY`, používá `app/api/auth/register`).

---

### 2.4 — 1.2 User-Generated Content `BLOKER`

**Pravidlo.** UGC app MUSÍ kumulativně mít: (1) **filtrování** závadného obsahu, (2) **hlášení** + včasná reakce (Apple v praxi **24 h**: odstranit + vyloučit autora), (3) **blokování** zneužívajících uživatelů, (4) zveřejněné **kontakty**. 5.1.1(v) EULA: aktivní souhlas s **zero-tolerance** klauzulí před přispěním. Chybí-li jediná položka → reject „Guideline 1.2".

**Riziko pro Fachmani.** 4 UGC plochy: (A) feed, (B) recenze fachmanů, (C) `customer_reviews`, (D) DM `app/zpravy/direct`. Stav: filtrování jen u feedu (AI moderace fail-open → `pending`); hlášení jen u feedu (`post_reports`); **blokování uživatelů NEEXISTUJE NIKDE**; kontakt OK (`info@fachmani.org`, IČO 24872849). EULA: pasivní text „Registrací souhlasíte…" (`app/auth/register/page.tsx` ř. 263-264), bez checkboxu, bez zero-tolerance. Reviewer si vytvoří 2 účty a hledá „Nahlásit" u každé plochy + „Blokovat".

**POVINNÉ akce.**
1. **Blokování uživatelů (P0):** tabulka `user_blocks` + RLS; akce „Blokovat" u profilu, autora feed příspěvku, autora recenze, v DM vlákně; filtrovat dotazy + zakázat DM insert blokujícímu.
2. **Hlášení na všech plochách (P0):** rozšířit reporting na recenze (`reviews`, `customer_reviews`) a DM; tlačítko „Nahlásit" do `ReviewForm`/recenzní karty + DM; do admin queue.
3. **Reakce do 24 h (P0):** deklarovat SLA v EULA + rozšířit admin moderaci na recenze/DM.
4. **EULA + zero-tolerance (P0):** povinný checkbox při registraci + věta o nulové toleranci + vyloučení do 24 h.
5. **Filtrování recenzí/DM (P1):** pustit přes `moderateText()` před uložením; flagged → `pending`.
6. Kontakt: zajistit `/kontakt` dostupný i nepřihlášenému + Support URL v ASC.

**Config / kód.**
```sql
CREATE TABLE public.user_blocks (
  id uuid PK DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_unique UNIQUE(blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY ub_insert_own ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY ub_select_own ON public.user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY ub_delete_own ON public.user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);
-- DM insert policy: AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_id = recipient_id AND b.blocked_id = auth.uid())
```
```sql
CREATE TABLE public.review_reports (
  id uuid PK DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  review_kind text NOT NULL CHECK (review_kind IN ('provider','customer')),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL CHECK (reason IN ('spam','inappropriate','fraud','fake','other')),
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, reporter_id)
);
```
```tsx
// app/auth/register/page.tsx – nahradit pasivní text (ř.263-264)
<label>
  <input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} />
  Souhlasím s <a href="/vop">VOP</a> a <a href="/pravidla-obsahu">Pravidly obsahu</a> a beru na
  vědomí nulovou toleranci vůči závadnému obsahu a zneužívajícím uživatelům.
</label>
// submit disabled dokud !agreed
```
VOP/Pravidla obsahu doplnit: *„Provozovatel uplatňuje nulovou toleranci vůči závadnému obsahu a zneužívajícím uživatelům; nahlášený závadný obsah odstraní a autora vyloučí nejpozději do 24 hodin od nahlášení."*

---

### 2.5 — Privacy Manifest (`PrivacyInfo.xcprivacy`) `BLOKER`

**Pravidlo.** Od 1.5.2024 ASC odmítne binárku bez deklarace required-reason API. Chyby: **ITMS-91053** (chybí API deklarace — Capacitor + WebKit volají UserDefaults/FileTimestamp), **ITMS-91061** (třetí SDK bez podepsaného manifestu). 4 klíče: `NSPrivacyTracking`, `NSPrivacyTrackingDomains`, `NSPrivacyCollectedDataTypes`, `NSPrivacyAccessedAPITypes`. Reason kódy: UserDefaults = **CA92.1**, FileTimestamp = **C617.1**, DiskSpace = E174.1, SystemBootTime = 35F9.1.

**Riziko pro Fachmani.** Bez manifestu = jistý ITMS-91053 ještě před review. Druhé: pokud se v ASC omylem zaškrtne „Tracking" nebo se přidá GA/Meta Pixel přes marketingovou cookie kategorii → tracking ve WebView → ATT povinný. Aktuálně `lib/cookieConsent.ts` říká „Žádné skripty třetích stran zatím nenačítáme" → `NSPrivacyTracking=false`, žádný ATT.

**POVINNÉ akce.**
1. Vytvořit `ios/App/App/PrivacyInfo.xcprivacy`, přidat do **Copy Bundle Resources** PŘED prvním uploadem.
2. Deklarovat UserDefaults (CA92.1) + FileTimestamp (C617.1); přes Xcode „App Privacy Report" ověřit, zda Capacitor pluginy netriggerují i DiskSpace/SystemBootTime.
3. `NSPrivacyTracking=false`, `NSPrivacyTrackingDomains=[]` dokud web nenačítá cross-site tracker.
4. Pravidlo: každý nový marketing/analytics tracker → ATT prompt + `NSPrivacyTrackingDomains` + `NSPrivacyTracking=true` + ASC labels.
5. Každý nový 3rd SDK ověřit na vlastní manifest (ITMS-91061).

**Config / kód.** Viz BUILD SPEC 4.3 (plný XML).

---

### 2.6 — 5.1 Privacy: App Privacy labels, ATT, 4.8 Login `BLOKER` (labels) / `LOW` (4.8)

**Pravidlo.**
- 5.1.1(i): Privacy policy v ASC **i uvnitř app**; jmenovitě uvést každou třetí stranu: Supabase, **Comgate a.s.**, **OpenAI** (Fachmánek — „sdílení s third-party AI" je nově explicitně v 5.1.2(i)), web-push službu.
- 5.1.2: tracking ve WKWebView (jako funkce app) = ATT povinný.
- App Privacy nutrition labels: vyplnit konzistentně s manifestem.
- **4.8 (korekce — DŮLEŽITÉ):** alternativní login (vč. Sign in with Apple) je vyžadován **JEN** když app používá third-party/social login (Facebook/Google) pro primární účet. Fachmani používá **výhradně** vlastní e-mail+heslo přes Supabase → spadá do výjimky „exclusively uses your company's own account setup" → **SiwA NENÍ povinné**. (Předchozí tvrzení „App Review běžně vyžaduje SiwA kdykoli je login" je nesprávné.)

**Riziko pro Fachmani.** Největší: neshoda cookie banner vs. App Privacy labels. Pokud v ASC omylem „Tracking" → ATT chybí → reject 5.1.2. Footer odkaz na facebook.com je jen hyperlink (ne pixel) → ATT neaktivuje.

**POVINNÉ akce.**
1. App Privacy labels podle reality: **Contact Info** (e-mail, jméno), **User Content** (recenze, příspěvky, foto, zprávy), **Identifiers** (user ID), **Purchases** (Premium/kredity). **NEZAŠKRTÁVAT „Tracking"** dokud žádný cross-site tracking neběží.
2. ATT: dokud bez 3rd analytiky → **NEpřidávat** `NSUserTrackingUsageDescription` ani nevolat ATT (nepoužitý prompt = samostatný reject). Po přidání GA4/Pixel → ATT prompt PŘED načtením + gate `marketing===true && ATT=authorized`.
3. Privacy policy dostupná i v app (menu/nastavení, ne jen footer), jmenovitě Supabase/Comgate/OpenAI/web-push.
4. SiwA neimplementovat kvůli 4.8 (není nutné); jen volitelný UX bonus.

**Config / kód.** Viz BUILD SPEC 4.2 (Info.plist) + 4.3 (manifest).

---

### 2.7 — 3.1.2 Disclosure u nákupu `BLOKER` (po zavedení IAP)

**Pravidlo.** U recurring nákupu disclose: název, délka termínu, „pokračuje dokud nezrušíte", přesná částka, jak zrušit + funkční odkazy na Privacy Policy a EULA.

**Riziko pro Fachmani.** `penezenka` ani `predplatne` nemají u tlačítka funkční odkazy na `/gdpr` + `/vop` ani plný auto-renew text. „Předplatné se automaticky obnovuje. Zrušit lze kdykoliv." (penezenka ř. 299) NESTAČÍ → typický 3.1.2 reject.

**POVINNÉ akce / kód.** U nákupního tlačítka (iOS varianta) zobrazit:
```
Premium
Předplatné se automaticky obnovuje za [cena z ASC] měsíčně a pokračuje,
dokud ho nezrušíte.
Období: 1 měsíc.
Zrušit lze v Nastavení > Apple ID > Předplatná.
[Zásady ochrany údajů /gdpr]   [Podmínky užití/EULA /vop]
```
- Pokud nepoužiješ vlastní EULA, vlož do ASC standardní Apple EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`.
- Legal stránky (`/gdpr`, `/vop`, `/cookies`) dostupné i nepřihlášenému a otevírat **uvnitř WKWebView** (ne externí Safari → pozor na Browser plugin konfiguraci).

---

### 2.8 — Push (APNs) + 4.5.4 `BLOKER` (funkčnost) / `MEDIUM` (4.5.4)

**Pravidlo.**
- 2.5.1: Web Push (Service Worker + PushManager + VAPID) ve WKWebView na iOS **NEFUNGUJE** → spoléhat na něj = nefunkční feature = reject. (Korekce: Service Workery ve WKWebView od iOS 14 **běžet mohou** přes App-Bound Domains; co nefunguje, je **Web Push/PushManager**. Závěr stejný — nutné nativní APNs.)
- 4.5.4: push nesmí být podmínkou fungování; marketingový push jen po explicitním in-app opt-in + opt-out v app. Transakční push (`new_offer`, `offer_accepted`, `new_candidate_request`) = OK.
- 5.1.2(i): funkce/odměny nesmí být vázané na zapnuté notifikace.
- Xcode: zapnout **Push Notifications** capability (`aps-environment`).

**Riziko pro Fachmani.** `PushOptIn.tsx` stojí na `serviceWorker`/`PushManager`/VAPID → na iOS stav „unsupported" („zkuste Chrome nebo Edge" — pro iOS matoucí) = nefunkční feature (2.1/2.5.1). Dobrá zpráva: fanout (`app/api/cron/push-fanout/route.ts` ř. 69) posílá **jen transakční** typy → 4.5.4-marketing se zatím netriggeruje. Past do budoucna: jakmile přidáte push pro `welcome`/`premium`/`topup`/`promotion`/`review` = marketing → nutný separátní opt-in toggle.

**POVINNÉ akce.**
1. Na iOS NEvolat Web Push cestu; skrýt `PushOptIn` VAPID UI, neregistrovat Service Worker pro push.
2. `@capacitor/push-notifications`: `requestPermissions()` → `register()` → listener `registration` → poslat APNs token na nový endpoint `/api/push/register-apns` (`platform='ios_apns'`).
3. Fanout cron rozšířit o APNs kanál (vedle Web Push).
4. Permission prompt kontextově (ne hned po startu), pre-permission priming.
5. Pokud přibude marketingový push → separátní in-app toggle + consent text + opt-out.

**Config / kód.**
```ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'ios') {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  PushNotifications.addListener('registration', t =>
    fetch('/api/push/register-apns', {
      method: 'POST',
      body: JSON.stringify({ token: t.value, platform: 'ios_apns' }),
    }));
}
// skrýt VAPID PushOptIn na iOS
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
  /* neregistrovat navigator.serviceWorker push */
}
```

---

## 3. MASTER COMPLIANCE CHECKLIST

> Seřazeno dle závažnosti. `[ ]` = nutno splnit před submitem.

### BLOKERY (bez nich = jistý reject)

**Monetizace / IAP (3.1.x)**
- [ ] Platformní guard `isIOSNative()` skrývá VŠECHNY Comgate cesty na iOS (`penezenka` ř. 95/119/238/295, `/api/payments/*`).
- [ ] Premium = auto-renewable IAP (`org.fachmani.premium.monthly`), Subscription Group v ASC, ceny z ASC.
- [ ] Kredity = consumable IAP balíčky; zůstatek server-side; připsání až po server-side verifikaci StoreKit transakce.
- [ ] Boosty/topování/nabídky placené z IAP-kreditů (server-side spend), nikdy přímý Comgate na iOS.
- [ ] Restore Purchases tlačítko (3.1.1).
- [ ] Comgate recurring (`initRecurring`) + webhook vypnuté v iOS buildu.
- [ ] `predplatne/page.tsx` simulace (přímý DB UPDATE bez platby) odstraněna.
- [ ] Disclosure u nákupu (3.1.2): plný auto-renew text + funkční odkazy `/gdpr` a `/vop` + EULA (vlastní nebo Apple stdeula v ASC).
- [ ] EU External Purchase Link Entitlement **NEPOUŽÍVAT** pro první pokus.

**Smazání účtu (5.1.1(v))**
- [ ] In-app „Trvale smazat účet" v `dashboard/profil` (1-2 kliknutí), 2-krokové potvrzení + re-auth.
- [ ] `app/api/account/delete/route.ts` (service-role): smaže UGC + anonymizuje účetní data + `auth.admin.deleteUser`.
- [ ] Potvrzovací e-mail + odhlášení po smazání.
- [ ] Žádný support-only flow (není regulované odvětví).
- [ ] Ověřeno **na iOS buildu**, že app NEMÁ login-wall (poptávky/feed bez přihlášení).

**UGC (1.2)**
- [ ] Tabulka `user_blocks` + RLS; „Blokovat uživatele" u profilu, feedu, recenzí, DM.
- [ ] Hlášení u recenzí (`reviews`, `customer_reviews`) + DM (tlačítko „Nahlásit").
- [ ] Filtrování recenzí (a volitelně DM) přes `moderateText()`.
- [ ] Zero-tolerance klauzule ve VOP/Pravidlech + reakce do 24 h deklarovaná.
- [ ] Aktivní checkbox souhlasu při registraci (nahradit pasivní text ř. 263-264).

**Privacy Manifest (ITMS-91053)**
- [ ] `ios/App/App/PrivacyInfo.xcprivacy` v Copy Bundle Resources; UserDefaults CA92.1 + FileTimestamp C617.1.
- [ ] `NSPrivacyTracking=false`, `NSPrivacyTrackingDomains=[]` (dokud bez trackeru).
- [ ] Každý 3rd SDK má vlastní manifest (ITMS-91061).

**Minimum Functionality (4.2)**
- [ ] Min. 4 nativní funkce: APNs push, kamera, offline stav, nativní chrome/splash/haptika.
- [ ] Bundlovaný lokální shell (app funguje bez sítě při startu).
- [ ] Žádný viditelný Safari chrome/URL bar.
- [ ] App Review notes: výčet nativních funkcí + „submituje přímo provozovatel obsahu" (4.2.6).

**Push funkčnost (2.5.1)**
- [ ] VAPID web push skryt na iOS; nativní APNs (`@capacitor/push-notifications`) + `/api/push/register-apns`.
- [ ] Fanout cron rozšířen o APNs kanál.

**Privacy labels / policy (5.1.1(i), 5.1.2)**
- [ ] App Privacy labels = realita (Contact, User Content, Identifiers, Purchases); **NEzaškrtnuto „Tracking"**.
- [ ] Žádný `NSUserTrackingUsageDescription`/ATT prompt dokud bez trackeru.
- [ ] Privacy policy v app + jmenovitě Supabase, Comgate a.s., OpenAI, web-push.
- [ ] Privacy Policy URL + Support URL vyplněné v ASC; `/kontakt` doručuje (vyřešit .org e-maily).

### HIGH / MEDIUM
- [ ] Kamera/galerie přes PHPicker (out-of-process), purpose strings v Info.plist (5.1.1(iii)).
- [ ] ATS výchozí (žádné `NSAllowsArbitraryLoads`).
- [ ] Deep links / Universal Links pro otvírání poptávek z notifikace.
- [ ] App badge count pro nepřečtené zprávy.
- [ ] Marketingový push: separátní opt-in toggle připraven (4.5.4) pro budoucí typy.
- [ ] Testovací účet (fachman + zákazník, e-mail+heslo) v App Review notes; popis cest k Smazat účet / Nahlásit / Blokovat / IAP.

### LOW (volitelné, ne-blokery)
- [ ] Sign in with Apple jako UX bonus (NENÍ 4.8 povinnost).
- [ ] Biometrické odemčení relace (Face ID).
- [ ] `@capacitor/share` nativní sdílení.

---

## 4. BUILD SPEC — scaffolding iOS aplikace

### 4.0 Příkazy scaffoldu
```bash
cd mobile
# ověřit aktuálnost Capacitor major vs. požadovaný Xcode/iOS SDK před scaffoldem
npm i @capacitor/push-notifications @capacitor/camera @capacitor/network \
      @capacitor/splash-screen @capacitor/status-bar @capacitor/haptics @capacitor/share
# RevenueCat NEBO @capacitor-community/in-app-purchases pro IAP
npx cap add ios
npx cap sync ios
npx cap open ios
```

### 4.1 `capacitor.config.ts`
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.fachmani.app',
  appName: 'Fachmani',
  webDir: 'www',                    // lokální shell – preferovat před čistě remote
  server: {
    // hybridní: lokální shell + remote data; pokud remote URL, pak s allowNavigation
    cleartext: false,
    allowNavigation: [
      'fachmani.org', '*.fachmani.org',
      '*.supabase.co',
      'pay1.comgate.cz', 'payments.comgate.cz',   // jen pro web fallback; na iOS Comgate skryt
    ],
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,    // true jen pokud nutný SW; pak WKAppBoundDomains (max 10 domén)
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 1200, backgroundColor: '#FFFFFF', showSpinner: false },
  },
};

export default config;
```
> Poznámka: pokud zapneš `limitsNavigationsToAppBoundDomains: true` + `WKAppBoundDomains`, omezíš na max 10 domén — musí tam být fachmani.org + Supabase + Comgate, jinak rozbití SSR/plateb.

### 4.2 Info.plist klíče
```xml
<!-- Kamera (foto poptávek/profilu) -->
<key>NSCameraUsageDescription</key>
<string>Fachmani potřebuje přístup ke kameře pro přidání fotografií k vaší poptávce nebo profilu.</string>

<!-- Galerie -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Fachmani potřebuje přístup k fotkám pro nahrání obrázků k poptávce, nabídce nebo profilu.</string>
<!-- NSPhotoLibraryAddUsageDescription jen pokud ukládáte do galerie -->

<!-- Push (remote notifikace) -->
<key>UIBackgroundModes</key>
<array><string>remote-notification</string></array>

<!-- ATT: PŘIDAT JEN pokud reálně vznikne tracking (GA/Pixel). Jinak VYNECHAT. -->
<!--
<key>NSUserTrackingUsageDescription</key>
<string>Pro měření účinnosti reklamy propojujeme údaje napříč aplikacemi a weby. Bez souhlasu aplikace funguje beze změny.</string>
-->

<!-- ATS: ponechat výchozí (vše HTTPS). NEpoužívat NSAllowsArbitraryLoads. -->
```
**Xcode Signing & Capabilities:** Push Notifications (`aps-environment` = production), Background Modes → Remote notifications, In-App Purchase. (Sign in with Apple **nepřidávat** — není nutné.)

### 4.3 `ios/App/App/PrivacyInfo.xcprivacy` (čistý shell bez trackingu)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>NSPrivacyTracking</key><false/>
  <key>NSPrivacyTrackingDomains</key><array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>
    </dict>
  </array>
</dict></plist>
```
> Pokud build log / App Privacy Report ukáže DiskSpace → přidat reason `E174.1`; SystemBootTime → `35F9.1`. Manifest MUSÍ být v „Copy Bundle Resources".

### 4.4 Nativní pluginy (instalovat + nakonfigurovat)
| Plugin | Účel | Compliance |
|---|---|---|
| `@capacitor/push-notifications` | APNs (náhrada VAPID) | 4.2, 2.5.1, 4.5.4 |
| `@capacitor/camera` | foto poptávek/profilu (PHPicker) | 4.2, 5.1.1(iii) |
| `@capacitor/network` | offline detekce + retry obrazovka | 4.2, 4.2.3 |
| `@capacitor/splash-screen` | nativní splash | 4.2 / HIG |
| `@capacitor/status-bar` | status bar styling | 4.2 / HIG |
| `@capacitor/haptics` | haptika u akcí | 4.2 (app-like) |
| `@capacitor/share` | nativní sdílení | 4.2 (volitelné) |
| RevenueCat / `@capacitor-community/in-app-purchases` | StoreKit IAP | 3.1.1, 3.1.2 |

### 4.5 Úpravy webu pro iOS (runtime gating přes `Capacitor.getPlatform()==='ios'`)
| Soubor | Úprava |
|---|---|
| centrální helper | `isIOSNative()` (viz 2.1) |
| `app/dashboard/fachman/penezenka/page.tsx` | na iOS skrýt Comgate (ř. 95/119/238/295), zobrazit IAP; restore tlačítko; disclosure text |
| `app/predplatne/page.tsx` | na iOS IAP; odstranit simulaci DB UPDATE (ř. 72-78) |
| `app/api/payments/{premium,topup}/route.ts` | na iOS nepoužité (guard na klientovi); web beze změny |
| `app/api/wallet/spend/route.ts` | beze změny (server-side spend OK) |
| `app/components/PushOptIn.tsx` | na iOS skrýt VAPID, použít APNs |
| `public/sw.js` / `lib/push/vapid.ts` | neregistrovat push SW na iOS |
| `app/auth/register/page.tsx` | aktivní checkbox souhlasu (ř. 263-264) |
| `app/dashboard/profil/page.tsx` | tlačítko „Trvale smazat účet" |
| nový `app/api/account/delete/route.ts` | smazání/anonymizace + `deleteUser` |
| nový `/api/push/register-apns` | APNs token endpoint |
| `ReviewForm` / `CustomerReviewForm` / `app/zpravy/direct` | „Nahlásit" + „Blokovat" + moderace recenzí |
| legal `/gdpr` `/vop` `/cookies` `/kontakt` | dostupné nepřihlášenému, otevírat ve WKWebView |

### 4.6 App Store Connect metadata
- **Bundle ID:** `org.fachmani.app` (In-App Purchase capability na App ID).
- **Privacy Policy URL:** `https://fachmani.org/gdpr` (veřejná, bez loginu).
- **Support URL:** `https://fachmani.org/kontakt` (musí doručovat — vyřešit .org e-maily).
- **App Privacy labels:** Contact Info, User Content, Identifiers, Purchases — vše „Linked", **NE Tracking**.
- **EULA:** vlastní `/vop` nebo Apple stdeula.
- **IAP produkty:** Subscription Group + `premium.monthly`; consumables `credits.*`; App-specific Shared Secret.
- **App Review Notes (vzor):**
  > Testovací účty: fachman `reviewer-fachman@…` / zákazník `reviewer-zakaznik@…` (e-mail+heslo, žádné OAuth).
  > Nativní funkce: APNs push, kamera, offline stav, splash, haptika, badge.
  > Monetizace: digitální funkce (Premium, kredity, boosty) = Apple IAP uvnitř app. Řemeslná práce fachmana = fyzická služba placená OFFLINE přímo fachmanovi, v app se neplatí (3.1.3(e)).
  > Smazání účtu: Profil → Nastavení účtu → Trvale smazat účet.
  > Hlášení/Blokování: u každého příspěvku, recenze, DM a profilu.
  > Aplikaci submituje přímo provozovatel obsahu (Fachmani, IČO 24872849), nejde o template/generovanou app (4.2.6).

---

## Otevřené body k vyřešení před submitem
1. **.org e-maily** (z MEMORY) — Support URL `/kontakt` musí reálně doručovat.
2. **iOS build bez login-wallu** — fyzicky otestovat, ne předpokládat (guard v `app/page.tsx`/`/poptavky` nenalezen).
3. **Capacitor 8 vs. Xcode/iOS SDK** kompatibilita v době submitu — ověřit minimální deployment target.
4. **Právní revize advokátem** (z MEMORY) — VOP/GDPR doplnit o IAP tok, zero-tolerance, proces smazání účtu, OpenAI disclosure.
