All verified. I have complete evidence from the real code. Final confirmed findings:

- **ChatWidget**: globally mounted (layout.tsx:42), no iOS gating, no report/block, only a weak disclaimer (line 259), no OpenAI consent. `/poradce` is a second unmoderated AI input.
- **AI routes** (`assistant`, `chat`): zero `moderateText()` calls on input or output.
- **Ghost/seed**: live and public; seeds searchable (`search_entities` includes `seed_provider`), ghosts have indexable profiles, fabricated reviews/ratings, "Neověřeno" badge suppressed for seeds (`!is_verified && !is_seed`).
- **UGC gaps**: no `blocked_users` table anywhere; DM/request chat have no report/block; reviews have no in-app report. Only feed has report (post_reports) + admin queue (only `/admin/moderace-feed`).
- **Feed & zpravy**: NOT iOS-gated.
- **Registration consent** already promises users can report AND block — but blocking doesn't exist (consistency gap).
- **Account deletion**: present in profil page, NOT iOS-gated (which is fine/required); `DeleteAccountSection.tsx` appears to be dead code.

Now I'll produce the decision document.

---

# Fachmani iOS — Feature audit & rozhodnutí pro 1. submit

*Audit proveden čtením reálného kódu (`app/`, `lib/`, `supabase/migrations/`) dne 2026-06-08. Žádný odhad — každý verdikt má oporu v konkrétním souboru a řádku.*

---

## 1. SHRNUTÍ — GO / NO-GO

**AS-IS (současný stav): NO-GO.** Aplikace by byla při prvním submitu téměř jistě zamítnuta, pravděpodobně z více důvodů najednou (kombinace hard-reject blokerů je nejhorší možný scénář — recenzent dostane dojem nedůvěryhodného vývojáře a kontroluje pak vše přísněji).

**PO DOPORUČENÝCH ÚPRAVÁCH: GO (schvalitelné na první pokus).** Po (A) vypnutí ghost/seed na iOS, (B) vypnutí nebo plné obměně AI chatu na iOS a (C) doplnění blokování + hlášení uživatelů do UGC ploch je riziko zamítnutí nízké. Konzervativní cesta = vypnout vše rizikové na iOS a vrátit po schválení.

### TOP 3 rizika (sestupně)

| # | Riziko | Guideline | AS-IS pravděpodobnost |
|---|--------|-----------|----------------------|
| 1 | **Ghost profily (ARES bez souhlasu) + fiktivní seed poskytovatelé s vymyšlenými recenzemi** | 5.1.1(viii), 1.1.6, 2.3.1, 3.2.2 | will_reject |
| 2 | **UGC bez blokování uživatelů + bez hlášení v DM/recenzích** (1.2 vyžaduje KOMPLETNÍ sadu) | 1.2 | will_reject |
| 3 | **Nemoderovaný generativní AI chat „Fachmánek" + „Poradce"** (bez moderace I/O, bez reportu, bez OpenAI consentu) | 1.2, 4.7, 5.1.2(i) | likely_reject |

**Pozn. k architektuře:** `isIOSNative()` je client-only (`lib/native.ts` čte `window.Capacitor`). SSR stránky ghost/seed (`force-dynamic`) potřebují **server-side detekci iOS** (User-Agent z WKWebView nebo custom hlavička z nativní vrstvy) — bez ní se ghost/seed na iOS server-render NEVYPNOU. Toto je nutná infrastrukturní podmínka pro řešení rizika #1.

---

## 2. ROZHODOVACÍ MATICE

Seřazeno podle rizika (nejvyšší nahoře).

| Funkce | Co dělá (ověřeno v kódu) | Riziko | Verdikt iOS | Akce |
|--------|--------------------------|--------|-------------|------|
| **Ghost profily (ARES)** | `ghost_subjects` (~150–290k subjektů z ARES bulk dumpu, bez souhlasu, bez `auth.user`). Veřejně čtené (RLS `ghost_subjects_public_read`), renderují se na `/fachmani` (`page.tsx:316–404`), vlastní indexovatelný profil `/fachman/ghost/[ico]` s JSON-LD `Organization`. GDPR disclosure schválně skrytá v zavřeném `<details>`, `text-gray-400`, opt-out místo souhlasu. | **will_reject** | **VYPNOUT** | Server-side iOS gate: na iOS nevracet `ghost_subjects` v `/fachmani`, `/fachman/ghost/[ico]` → `notFound()`, vyřadit z hledání i AI search. |
| **Fiktivní seed poskytovatelé** | `seed_providers` + `seed_reviews`. Admin UI „🎭 Fiktivní fachmani / Seed data". Na veřejnosti renderováni IDENTICKY jako reální (`fachman/[id]/page.tsx`). Fabrikovaný rating + `review_count` + vymyšlené `customer_name`/`comment`. Badge „Neověřeno" se u seedů AKTIVNĚ potlačuje: `!is_verified && !is_seed` (`fachman/[id]:412`, `fachmani:507`). Vyhledatelní: `search_entities` zahrnuje `entity_type='seed_provider'`. | **will_reject** | **VYPNOUT** | Server-side iOS gate: nevracet `seed_providers` v `/fachmani`, na `/fachman/[id]` pokud `id.startsWith("seed_")` → `notFound()`, vyřadit `seed_provider` z `/api/search` a AI search. |
| **Blokování uživatelů** | **NEEXISTUJE NIKDE.** Žádná tabulka `blocked_users`, žádné UI (grep: 0 výskytů; všechny `block` = trial/payment blocking). **Registrace přitom uživateli SLIBUJE** „uživatele lze nahlásit a blokovat" (`auth/register:243–244`) — funkce neexistuje = i nepravdivý slib. | **will_reject** | **DODĚLAT** (nelze obejít vypnutím, pokud zůstanou DM/feed) | Tabulka `blocked_users (blocker_id, blocked_id)` + RLS; tlačítko „Blokovat" v DM, request chatu a na profilu; blokovaný nesmí psát ani být viditelný. |
| **AI chat „Fachmánek"** | Globálně mountovaný `<ChatWidget />` (`layout.tsx:42`) bez gatingu. gpt-4o-mini, function calling (`search_fachmani`, `prepare_poptavka`), volný vstup až 2000 znaků (`ChatWidget.tsx:245`). **`moderateText()` se NEVOLÁ** ani na vstup, ani na výstup (grep: 0 v `assistant/route.ts`). Žádné hlášení, jen slabý disclaimer (řádek 259). Žádný OpenAI consent před odesláním. | **likely_reject** | **VYPNOUT** (preferováno) / UPRAVIT | `if (isIOSNative()) return null;` v `ChatWidget.tsx`. Vrátit až po doplnění moderace I/O + reportu + OpenAI disclosure. |
| **AI „Poradce" (`/poradce`)** | Druhý generativní vstup (`/api/ai/chat`, gpt-4o-mini), stejný vzor, taktéž BEZ moderace (grep: 0 „moderat" v `chat/route.ts`). | **likely_reject** | **VYPNOUT** (preferováno) / UPRAVIT | iOS gate na stránce `/poradce` (skrýt/redirect) nebo stejné safety vrstvy jako u Fachmánka. |
| **Hlášení recenzí** | Recenze na profilu (`fachman/[id]`) a `CustomerReviewForm.tsx` nemají in-app hlášení; jen admin-side moderace. | **likely_reject** | **DODĚLAT** | Tlačítko „Nahlásit recenzi" → znovupoužít vzor `post_reports`. |
| **Hlášení v DM / request chatu** | `zpravy/direct/[userId]` (403 ř.) i `zpravy/[requestId]/[userId]` (378 ř.): NULA hlášení, NULA blokování. Raw insert do `messages`. Není iOS-gated. | **likely_reject** | **DODĚLAT** | In-app „Nahlásit zprávu/uživatele" v obou chat plochách. |
| **AI search tool (ghost/seed leak)** | `assistant/route.ts` tool `search_fachmani` může vracet seed/ghost (stejný datový zdroj). | medium | **UPRAVIT** | Server-side filtr: na iOS tool nevrací `seed_provider`/ghost (váže se na řešení #1). |
| **Feed (komunita)** | Má in-app hlášení postů (`post_reports`, 🚩 `feed/page.tsx:610`), reason enum, admin queue `/admin/moderace-feed`, AI pre-publish moderaci (`/api/moderation/check`). **Chybí blokování uživatelů.** Není iOS-gated. | medium | **KEEP** (s blokováním z řádku výše) | Ponechat; doplnit blokování uživatelů (řeší se globálně). |
| **Platby/nákupy** | Comgate, předplatné, kredity, boosty, ceník, peněženka. | — | **HOTOVO (KEEP gating)** | Už gated přes `iosNative`/`canShowPurchases` (`dashboard/fachman`, `cenik`, `predplatne`, `penezenka`, `nova-poptavka:300`). Ověřit, že na iOS nikde nezůstal odkaz na placené extra. |
| **Smazání účtu** | `/dashboard/profil` inline delete (řádek 1155, `showDelete`), volá `/api/account/delete`. **NENÍ iOS-gated** (grep `ios` = 0). | — | **KEEP** | Apple 5.1.1(v) in-app smazání účtu VYŽADUJE — nechat zapnuté. (`DeleteAccountSection.tsx` se nikde neimportuje = patrně mrtvý kód, lze smazat.) **POZOR: kontext tvrdil, že delete je na iOS skryté — NENÍ a nemá být.** |
| **Aktivní souhlas při registraci** | Checkbox `agreed` (`auth/register:231`, povinný), zmiňuje pravidla obsahu i nulovou toleranci. | — | **KEEP** | Hotovo. Ale text slibuje „blokovat" — viz řádek blokování. |
| **Web push / APNs** | `PushOptIn.tsx` přepíná na nativní na iOS. | low | **KEEP** | Beze změny. |
| **Sitemap / SEO / JSON-LD** | `sitemap.ts`, ghost JSON-LD — týká se jen webu. | none (web) | **KEEP** (web) | iOS se netýká; neměnit. |

---

## 3. SEZNAM „VYPNOUT na iOS pro 1. submit" (gating)

Vše obejitelné vypnutím — odstranit z iOS buildu a vrátit po schválení.

1. **Ghost profily** — `app/fachmani/page.tsx`: na iOS nevytvářet `ghostSlice`/`ghostCount`, `totalCount` jen z reálných profilů. `app/fachman/ghost/[ico]/page.tsx`: na iOS `notFound()`. **Vyžaduje server-side iOS detekci** (UA/hlavička z WKWebView) — `isIOSNative()` zde nestačí (SSR).
2. **Seed poskytovatelé** — `app/fachmani/page.tsx`: na iOS nedotahovat `seed_providers` (blok ~203–233). `app/fachman/[id]/page.tsx`: na iOS pokud `id.startsWith("seed_")` → `notFound()`.
3. **Seed/ghost ve vyhledávání** — `app/api/search/route.ts`: na iOS vynutit `typeFilter` bez `seed_provider` a vyřadit ghost trgm větev (server-side UA gate).
4. **AI „Fachmánek"** — `app/components/ChatWidget.tsx`: `if (isIOSNative()) return null;` (client-side stačí, je to komponenta).
5. **AI „Poradce"** — `app/poradce/page.tsx`: na iOS skrýt/redirect.
6. **AI search tool** — `app/api/ai/assistant/route.ts`: na iOS tool nevrací seed/ghost.

*(Platby/kredity/boosty/ceník už vypnuté — neopakovat.)*

---

## 4. SEZNAM „DODĚLAT před submitem" (blokery, které NELZE obejít vypnutím)

Pokud na iOS zůstanou **DM, request chat, feed nebo recenze** (a měly by — bez nich appka ztrácí smysl), pak Guideline 1.2 vyžaduje KOMPLETNÍ sadu. Tyto body nelze „vypnout" jinak než vypnutím celé komunikace, což nedoporučuji:

1. **MUST — Blokování uživatelů.** Tabulka `blocked_users (blocker_id, blocked_id, created_at)` + RLS; tlačítko „Blokovat" v DM (`zpravy/direct/[userId]`), request chatu (`zpravy/[requestId]/[userId]`) a na profilu fachmana; blokovaný nesmí posílat zprávy ani být viditelný. **Bez tohoto 1.2 prakticky vždy padá** — a registrace už blokování slibuje (`auth/register:244`), takže jeho absence je i nepravdivé tvrzení.
2. **MUST — In-app hlášení do DM + request chatu.** „Nahlásit zprávu / uživatele" → znovupoužít vzor `post_reports` (reason enum + admin queue). E-mail v `pravidla-obsahu` nestačí jako jediný kanál pro interaktivní UGC plochu.
3. **MUST — In-app hlášení recenzí.** Tlačítko na profilu fachmana (`fachman/[id]`) a/nebo v `CustomerReviewForm.tsx`.
4. **MUST (pokud AI zůstane na iOS) — Moderace + report + consent v AI chatu.** `moderateText()` na vstup PŘED voláním OpenAI i na `finalMessage` výstupu v `assistant/route.ts` a `chat/route.ts` (při flagged vrátit bezpečnou odpověď); tlačítko „Nahlásit" ve widgetu; jednorázový in-app disclosure/consent „zprávy zpracovává OpenAI" před prvním odesláním (5.1.2(i), platné od 13.11.2025). *Doporučuji raději AI na iOS vypnout (bod 3) a tyto úpravy udělat až po schválení.*

---

## 5. Finální PRE-SUBMIT CHECKLIST

**Server-side iOS detekce (předpoklad pro ghost/seed gating)**
- [ ] Nativní vrstva posílá identifikovatelnou hlavičku/UA z WKWebView; server helper `isIOSRequest()` pro SSR stránky.

**Risk #1 — Ghost/Seed VYPNUTO na iOS**
- [ ] `/fachmani` na iOS bez ghost i seed; `totalCount` jen reální.
- [ ] `/fachman/ghost/[ico]` na iOS → `notFound()`.
- [ ] `/fachman/[id]` na iOS pro `seed_*` → `notFound()`.
- [ ] `/api/search` a AI `search_fachmani` na iOS bez `seed_provider`/ghost.
- [ ] Manuální test v iOS buildu: katalog ukazuje jen reálné ověřitelné lidi, žádné „(N hodnocení)" u fiktivních.

**Risk #2 — UGC 1.2 kompletní**
- [ ] `blocked_users` tabulka + RLS nasazené.
- [ ] „Blokovat" v DM, request chatu, na profilu — funkční (blokovaný nepíše, není vidět).
- [ ] „Nahlásit" v DM, request chatu, u recenzí — zapisuje do reports + admin queue.
- [ ] Feed report (`post_reports`) funguje na iOS.
- [ ] Zveřejněný kontakt na podporu dostupný z UGC ploch.

**Risk #3 — AI chat**
- [ ] `ChatWidget` na iOS `return null` (NEBO: moderace I/O + report + OpenAI consent hotové a otestované).
- [ ] `/poradce` na iOS skryté (NEBO stejné safety vrstvy).

**Hotové (jen ověřit, že nezůstal odkaz)**
- [ ] Žádná platba/nákup/peněženka/ceník/boost/kredit/extra poptávka na iOS (Comgate, předplatné).
- [ ] In-app smazání účtu na iOS **funguje** (5.1.1(v)) — `/dashboard/profil` delete otestovat v nativním shellu.
- [ ] Povinný souhlas při registraci funguje; text odpovídá realitě (po doplnění blokování slib „blokovat" platí).

**Metadata / App Store Connect**
- [ ] Age rating odpovídá UGC (uživatelská komunikace).
- [ ] EULA/Privacy odkaz, kontakt na podporu, popis funkcí bez zmínky o platbách na iOS.
- [ ] Demo účet pro recenzenta + poznámka, že platby běží mimo aplikaci (web), na iOS nejsou.

---

**Závěr:** Po vypnutí ghost/seed a AI chatu na iOS (server-side gate u ghost/seed) a doplnění blokování + hlášení do DM/recenzí je aplikace schvalitelná na první pokus. Nejrizikovější a nejčastěji přehlížený bod je **chybějící blokování uživatelů** — neexistuje v kódu vůbec, a navíc ho registrace uživateli slibuje. To je nutné dodělat; vypnutím se neobejde, pokud na iOS zůstane jakákoli mezilidská komunikace.

Relevantní soubory: `/Users/adstart_rota/Documents/fachmani/app/layout.tsx`, `/Users/adstart_rota/Documents/fachmani/app/components/ChatWidget.tsx`, `/Users/adstart_rota/Documents/fachmani/app/api/ai/assistant/route.ts`, `/Users/adstart_rota/Documents/fachmani/app/api/ai/chat/route.ts`, `/Users/adstart_rota/Documents/fachmani/app/fachmani/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/fachman/[id]/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/fachman/ghost/[ico]/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/api/search/route.ts`, `/Users/adstart_rota/Documents/fachmani/app/zpravy/direct/[userId]/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/zpravy/[requestId]/[userId]/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/feed/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/auth/register/page.tsx`, `/Users/adstart_rota/Documents/fachmani/app/dashboard/profil/page.tsx`, `/Users/adstart_rota/Documents/fachmani/lib/native.ts`, `/Users/adstart_rota/Documents/fachmani/lib/moderation.ts`.