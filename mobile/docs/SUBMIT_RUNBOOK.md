# Fachmani iOS — Runbook k odeslání do App Store

**Stav (2026-06-08): compliance HOTOVÉ a nasazené na produkci. Zbývají jen 2 kroky, které
vyžadují tvůj Mac + Apple Developer účet (Xcode archive, APNs .p8 klíč).**

App je nativní Capacitor 8 obal, který přes `server.url` načítá `https://fachmani.org`
a injektuje nativní bridge. iOS projekt je v `mobile/ios`.

Související dokumenty:
- `APP_STORE_CONNECT_SUBMISSION.md` — metadata, App Privacy odpovědi, review notes (copy-paste)
- `PUSH_APNS_SETUP.md` — APNs .p8 klíč + Vercel env
- `FEATURE_AUDIT_DECISION.md` — co a proč je na iOS vypnuté

---

## 1. Co je HOTOVÉ a nasazené

**Compliance na iOS (gating přes UA marker `FachmaniApp-iOS` server-side + `isIOSNative()` client-side):**
- **3.1.1/3.1.3 monetizace** — na iOS žádné ceny, nákupy, „Premium" CTA, peněženka ani platební
  loga (Comgate/VISA/Mastercard/Apple Pay). Navbar/Footer/homepage/dashboardy/nová poptávka/
  detail poptávky/feed/pro-fachmany/jak-to-funguje + stránky cenik/predplatne/penezenka neutralizované.
  Model = **hybrid bez IAP** (v aplikaci se nic neprodává → 3.1.1 se neuplatní).
- **1.2 UGC** — `blocked_users` + `content_reports` (vč. komentářů) + trigger blokující zprávy.
  Tlačítka **Nahlásit/Blokovat** v recenzích, zprávách, profilech, feedu i komentářích. Feed
  skrývá blokované autory. AI moderace příspěvků i komentářů. EULA souhlas vynucen v UI i serveru.
- **Fiktivní obsah** — ghost (ARES) a seed profily na iOS vypnuté (404/skryté) v katalogu,
  kategoriích, vyhledávání, detailech i homepage statistice.
- **4.7 AI** — Fachmánek chat, /poradce i AI endpointy na iOS vypnuté (404/redirect).
- **5.1.1(v)** — smazání účtu v dashboardu (zákazník i fachman).
- **5.1.2 privacy** — `PrivacyInfo.xcprivacy` (žádný tracking; Email/Name/Phone/UserID/Photos/
  UserContent = AppFunctionality; **Location NEsbíráme**). Required-reason API deklarované.

**iOS projekt (`mobile/`):**
- `capacitor.config.ts` — appId `org.fachmani.app`, server.url, allowNavigation, `appendUserAgent`.
- `Info.plist` — kamera/fotky usage strings, UIBackgroundModes=remote-notification,
  `ITSAppUsesNonExemptEncryption=false`, MARKETING_VERSION 1.0 / build 1, deployment target iOS 15.
- `App.entitlements` — `aps-environment = production`.
- App icon 1024×1024 (brand gradient + „F", bez alfa).
- 9 nativních pluginů (push-notifications, camera, network, …). `cap sync` proběhl.

**Push (APNs):** server-side hotové a fail-safe (device_tokens, sender, registrace, fan-out).
Chybí jen tvůj .p8 klíč + Vercel env — viz `PUSH_APNS_SETUP.md`.

**Demo účty pro App Review** (založené, přihlášení ověřené):
- zákazník `appstore.review@fachmani.org` / `FachmaniReview2026!`
- fachman `appstore.fachman@fachmani.org` / `FachmaniReview2026!`

---

## 2. Předpoklady (tvůj Mac)
- macOS + **Xcode 16+** (v tomto prostředí byl jen Command Line Tools → projekt nešlo lokálně archivovat).
- Apple Developer účet. App ID **`org.fachmani.app`** s capability **Push Notifications**.
- CocoaPods není potřeba (Capacitor 8 = Swift Package Manager).

## 3. Build + Archive v Xcode
```bash
cd mobile
npm install        # při čerstvém clonu
npx cap sync ios
npx cap open ios   # otevře Xcode
```
V Xcode:
1. Target **App** → Signing & Capabilities → vyber **Team**, Bundle ID `org.fachmani.app`.
2. Capabilities: **Push Notifications** + **Background Modes → Remote notifications** (entitlements už v repu). IAP NEPŘIDÁVAT.
3. Vyber **Any iOS Device (arm64)** → Product → **Archive** → Distribute App → App Store Connect → Upload.
4. (Doporučeno) napřed Run na reálném iPhonu: ověř načtení webu, kameru u poptávky, push permission prompt.

## 4. App Store Connect
Všechno copy-paste z **`APP_STORE_CONNECT_SUBMISSION.md`**:
- App Information, popis, klíčová slova, kategorie (Business / Lifestyle).
- **App Privacy** — dle tabulky (žádný tracking, žádná location).
- **Age Rating** — doporučeno **4+** (UGC moderovaný + report/block/EULA); Unrestricted Web Access = No.
- **App Review Information** — Sign-In: `appstore.review@fachmani.org` / `FachmaniReview2026!` + Notes.
- **Screenshots** — `mobile/assets/screenshots/*.png` (7× 1290×2796, 6.7"). Stačí jedna sada.
- **Export compliance** — odpověz **No** (ITSAppUsesNonExemptEncryption=false).

## 5. APNs (push pro launch)
Viz **`PUSH_APNS_SETUP.md`**: vytvoř .p8 klíč → nastav Vercel env (`APNS_KEY_ID`, `APNS_TEAM_ID`,
`APNS_BUNDLE_ID=org.fachmani.app`, `APNS_PRIVATE_KEY`, `APNS_ENVIRONMENT=production`). Fan-out cron
pak začne posílat i APNs. Bez klíče je push fail-safe vypnutý, nic se nerozbije.

---

## 6. Checklist před „Submit for Review"
- [x] Compliance (3.1.1, 1.2, 4.2, 4.7, 5.1.1, 5.1.2) — hotové a nasazené na fachmani.org
- [x] Multi-agent compliance audit + vizuální revize screenshotů — opraveno
- [x] Demo účty založené a v review notes
- [x] App icon 1024×1024 bez alfa
- [x] `cap sync` proběhl
- [ ] **Xcode Archive + Upload** (tvůj krok — §3)
- [ ] **APNs .p8 klíč + Vercel env** (tvůj krok — §5; volitelné pro v1, ale zvoleno pro launch)
- [ ] Vyplnit ASC metadata/privacy/screenshots dle §4
- [ ] (doporučeno) onboardnout pár reálných fachmanů — katalog na iOS teď ukazuje ~8 + demo

## 7. Poznámka k monetizaci (v2, volitelné)
v1 je bez IAP (nic se v aplikaci neprodává). Pokud později budeš chtít prodávat Premium/kredity
přímo v aplikaci, je nutné Apple IAP (StoreKit / RevenueCat) + server-side ověření účtenek a
přepnout iOS gating z „skryto" na IAP nákup. Apple si bere 15–30 %. Vyžaduje tvé rozhodnutí.
