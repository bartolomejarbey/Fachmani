# Fachmani iOS — Runbook k odeslání do App Store

Stav: scaffolding + compliance v1 hotové. iOS projekt je v `mobile/ios`. Web aplikaci
(fachmani.org) app načítá přes `server.url` a injektuje nativní bridge (Capacitor 8).

---

## 1. Co je HOTOVÉ (v tomto repu)

**iOS projekt (`mobile/`)**
- `capacitor.config.ts` — `appId: org.fachmani.app`, `appName: Fachmani`, `server.url=https://fachmani.org`, `allowNavigation` (fachmani.org, *.supabase.co), splash/push plugin config.
- `ios/App/App.xcodeproj` — vygenerovaný Xcode projekt (Capacitor 8, Swift Package Manager).
- `ios/App/App/Info.plist` — `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `UIBackgroundModes=remote-notification`, `ITSAppUsesNonExemptEncryption=false`, `UIRequiredDeviceCapabilities=arm64`, region `cs`.
- `ios/App/App/PrivacyInfo.xcprivacy` — privacy manifest (žádný tracking; data types Email/Name/Phone/UserID/Photos/UserContent/CoarseLocation = AppFunctionality; required-reason API: UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1). **Registrováno v „Copy Bundle Resources".**
- `AppDelegate.swift` — APNs callbacky napojené na Capacitor push plugin.
- App icon 1024×1024 (bez alpha) + splash z loga Fachmani.
- Nativní pluginy: push-notifications, camera, network, splash-screen, status-bar, haptics, share, app, device.

**Web compliance (v hlavní Next.js app — gated `isIOSNative()` z `lib/native.ts`)**
- Skrytí nákupu digitálních funkcí na iOS přes **6 vstupních bodů** (žádný Comgate, žádné „Kč" CTA, žádné navádění mimo Apple):
  - `app/dashboard/fachman/penezenka/page.tsx` — skryt celý blok dobíjení + Premium (zůstatek/historie read-only).
  - `app/predplatne/page.tsx` — skryta tlačítka „Pořídit Premium/Business".
  - `app/cenik/page.tsx` — na iOS neutrální stránka bez cen a CTA.
  - `app/dashboard/fachman/page.tsx` — skryté všechny 4 CTA „Upgradovat/Aktivovat/Přejít na Premium".
  - `app/poptavka/[id]/page.tsx` — modal „nedostatek kreditu" na iOS bez Kč a bez „Dobít peněženku".
  - `app/nova-poptavka/page.tsx` — placená extra poptávka na iOS neúčtována; neutrální hláška o limitu.
- `app/components/PushOptIn.tsx` — na iOS skryt web push (VAPID v WKWebView nefunguje).
- **Smazání účtu (5.1.1(v))** — `app/api/account/delete/route.ts` (service-role) + sdílená komponenta `app/components/DeleteAccountSection.tsx` zobrazená pro **zákazníky** (`app/dashboard`) i **fachmany** (`app/dashboard/profil`). 2-krokové potvrzení (napsat „SMAZAT").
- **Aktivní souhlas při registraci (1.2 EULA)** — `app/auth/register/page.tsx`: povinný checkbox s odkazem na VOP/pravidla obsahu + uznání nulové tolerance, blokuje odeslání.

**Strategie monetizace v1 (DŮLEŽITÉ ROZHODNUTÍ — viz §6):** na iOS se v aplikaci NEPRODÁVAJÍ
žádné digitální funkce → guideline 3.1.1 se neuplatní (vzor Netflix/Spotify reader). Marketplace
funguje plně (poptávky, nabídky, recenze, zprávy). Premium/kredity koupené na webu zůstávají funkční.

---

## 2. Předpoklady (na vašem Macu)
- macOS + **Xcode 16+** (zde v prostředí byl jen Command Line Tools → projekt nešlo lokálně zkompilovat; build proveďte v Xcode).
- Apple Developer účet (máte — approved). App ID **`org.fachmani.app`** s capabilities Push Notifications.
- CocoaPods není potřeba (Capacitor 8 = SPM).

## 3. Build v Xcode
```bash
cd mobile
npm install          # pokud čerstvý clone
npx cap sync ios
npx cap open ios     # otevře Xcode
```
V Xcode:
1. Target **App** → Signing & Capabilities → vyber svůj **Team**, Bundle Identifier `org.fachmani.app`.
2. Capabilities: **Push Notifications**, **Background Modes → Remote notifications**. (In-App Purchase NEPŘIDÁVAT, dokud nejde v2 IAP — viz §6.)
3. Set **Deployment Target** na iOS 15.0+ (dle aktuálního Apple minima).
4. Vyber zařízení/simulátor → Build (⌘B). Otestuj na reálném iPhonu (push, kamera, offline režim v letadlovém módu).
5. Product → Archive → Distribute App → App Store Connect → Upload.

## 4. Nasadit web compliance změny na produkci
App načítá `fachmani.org`, takže gates + smazání účtu **musí být nasazené**:
```bash
# z kořene repa
git add lib/native.ts app/api/account/delete app/dashboard/fachman/penezenka/page.tsx \
        app/predplatne/page.tsx app/dashboard/profil/page.tsx app/components/PushOptIn.tsx
git commit -m "feat(ios): App Store compliance — hide purchases on iOS + account deletion"
git push    # Vercel nasadí na fachmani.org
```

## 5. App Store Connect — metadata
- **Bundle ID:** `org.fachmani.app`
- **Privacy Policy URL:** `https://fachmani.org/gdpr`
- **Support URL:** `https://fachmani.org/kontakt`  ⚠️ ověř, že .org e-maily reálně doručují.
- **App Privacy labels:** Contact Info (e-mail, jméno, telefon), User Content (fotky, recenze, zprávy), Identifiers (User ID) — vše **Linked, „App Functionality"**, **NE „Tracking"**.
- **Age rating:** dle dotazníku (UGC + zprávy → pravděpodobně 17+ kvůli neomezené komunikaci; nebo nižší s moderací — vyplň dle reality).
- **Export compliance:** vyřešeno `ITSAppUsesNonExemptEncryption=false`.
- **Screenshots:** 6.9" (1320×2868), 6.5" (1242×2688) a iPad 13" (2064×2752) — pořiď ze simulátoru.
- **EULA:** vlastní `/vop` nebo Apple standard EULA.

### App Review Notes (vzor — vlož do „Notes")
```
Testovací účty (e-mail+heslo, žádné OAuth):
  zákazník: reviewer-zakaznik@fachmani.org / <heslo>
  fachman:  reviewer-fachman@fachmani.org / <heslo>

Nativní funkce: APNs push (capability), nativní kamera/galerie (foto poptávek/profilu),
offline obrazovka (vyzkoušejte letadlový mód při startu), splash, haptika, status bar.

Monetizace: V iOS aplikaci se NEPRODÁVAJÍ žádné digitální funkce — žádné nákupy v aplikaci.
Marketplace propojuje zákazníky s řemeslníky; řemeslná práce je fyzická služba placená
OFFLINE přímo poskytovateli, v aplikaci se neplatí (3.1.3(e)).

Smazání účtu: Profil → dole „Smazat účet" → napsat SMAZAT → potvrdit (trvale smaže účet i data).
Nahlášení/blokování obsahu: u příspěvků ve feedu (a u recenzí/zpráv — viz §7, dokončit před submitem).

Aplikaci odesílá přímo provozovatel obsahu Fachmani Network s.r.o. (IČO 24872849), nejde o
template/generovanou aplikaci (4.2.6).
```

---

## 6. KLÍČOVÉ ROZHODNUTÍ — monetizace na iOS
**v1 (implementováno): nákupy skryté.** Nejnižší riziko zamítnutí, plně hotové. Nevýhoda: na iOS
nelze koupit Premium ani kredity (uživatel je pořídí na webu; v app jen využívá).

**v2 (volitelné, doporučeno researchem pro zachování příjmů): Apple IAP.** Vyžaduje:
- StoreKit přes **RevenueCat** nebo `@capacitor-community/in-app-purchases`,
- v App Store Connect: Subscription Group + `org.fachmani.premium.monthly` (auto-renew) + consumable kredity `org.fachmani.credits.*`, App-specific Shared Secret,
- server-side ověření transakce → připsání do `wallets` (analogie dnešního Comgate webhooku),
- Restore Purchases tlačítko, disclosure text (3.1.2),
- na iOS přepnout `penezenka`/`predplatne` z „skryto" na IAP nákup.
Apple si bere 15–30 % (resp. EEA Core Technology Commission). **Vyžaduje vaše rozhodnutí.**

---

## 7. ZBÝVÁ DOKONČIT PŘED SUBMITEM (must-do)
- [ ] **Otevřít projekt v Xcode a skutečně sestavit/archivovat** (zde nešlo — chyběl plný Xcode).
- [ ] **Nasadit web změny na fachmani.org** (§4) — jinak app načte web bez gates.
- [ ] **APNs**: vytvořit APNs Auth Key (.p8) v Apple Developer; napojit nativní registraci tokenu
      (`window.Capacitor.Plugins.PushNotifications.register()`) + endpoint pro uložení tokenu +
      rozšířit fanout cron o APNs kanál. (Web push je na iOS skryt.)
- [ ] **UGC 1.2**: doplnit blokování uživatelů (`user_blocks`) + „Nahlásit" u recenzí a zpráv
      (feed hlášení už existuje). Bez toho hrozí zamítnutí kvůli UGC.
- [ ] **Ověřit, že web nemá login-wall** — poptávky/feed jdou prohlížet bez přihlášení.
- [ ] (web bug) `app/predplatne` na webu nastavuje předplatné přímým DB UPDATE bez platby — napojit na reálnou platbu.
- [ ] Screenshots, App Privacy dotazník, age rating, testovací účty v ASC.

## 8. Finální checklist před „Submit for Review"
Viz **`APP_STORE_COMPLIANCE_BUILD_SPEC.md` → §3 MASTER COMPLIANCE CHECKLIST** (blokery → low).
