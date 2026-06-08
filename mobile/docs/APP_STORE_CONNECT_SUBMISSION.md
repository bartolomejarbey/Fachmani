# App Store Connect — podklady k odeslání (copy-paste)

Vše níže je připravené k vložení do App Store Connect. Primární jazyk: **čeština (cs)**.
Bundle ID: `org.fachmani.app` · App name: **Fachmani**.

---

## 1. App Information

| Pole | Hodnota |
|---|---|
| **Name** | Fachmani |
| **Subtitle** (30 zn.) | Najdi ověřeného řemeslníka |
| **Primary Category** | Business |
| **Secondary Category** | Lifestyle |
| **Support URL** | https://fachmani.org/kontakt |
| **Marketing URL** | https://fachmani.org |
| **Privacy Policy URL** | https://fachmani.org/gdpr |

---

## 2. Promotional Text (170 zn.)
```
Najděte ověřeného řemeslníka rychle a bez provizí. Zadejte poptávku zdarma a nechte fachmany, ať se ozvou. Hodnocení, profily a přímá komunikace na jednom místě.
```

## 3. Description
```
Fachmani propojují zákazníky s ověřenými řemeslníky a profesionály po celé ČR.

JAK TO FUNGUJE
• Zadejte poptávku zdarma — popište, co potřebujete, a kam.
• Ověření fachmani vám pošlou nabídky.
• Vyberte si podle profilu, hodnocení a komunikace.
• Domluvte se napřímo v aplikaci.

PRO ZÁKAZNÍKY
• Bezplatné zadání poptávky
• Ověření poskytovatelé a reálná hodnocení
• Přímý chat s řemeslníkem
• Přehled kategorií: instalatéři, elektrikáři, malíři, zedníci, truhláři a další

PRO ŘEMESLNÍKY
• Vytvořte si profil a získávejte zakázky ve svém okolí
• Reagujte na poptávky zákazníků
• Budujte si recenze a důvěru

BEZPEČNÍ A V POHODĚ
• Nevhodný obsah i uživatele lze kdykoli nahlásit nebo zablokovat.
• Nulová tolerance k závadnému obsahu.

Fachmani jsou zdarma ke stažení i k zadání poptávky.
```

## 4. Keywords (100 zn., čárkami, bez mezer navíc)
```
řemeslník,fachman,instalatér,elektrikář,malíř,poptávka,oprava,rekonstrukce,zedník,truhlář,hodinový manžel
```

## 5. What's New (text verze 1.0)
```
První verze Fachmani. Najděte ověřeného řemeslníka, zadejte poptávku zdarma a domluvte se napřímo.
```

---

## 6. App Privacy (App Privacy → Data Types)

Odpovídá `PrivacyInfo.xcprivacy`. **Tracking: NE** (žádné ATT, žádné tracking domény).
Vše „Linked to you" a účel **App Functionality**, žádné „Used for Tracking".

| Data Type | Collected | Linked | Tracking | Účel |
|---|---|---|---|---|
| Email Address | ✅ | ✅ | ❌ | App Functionality |
| Name | ✅ | ✅ | ❌ | App Functionality |
| Phone Number | ✅ | ✅ | ❌ | App Functionality |
| User ID | ✅ | ✅ | ❌ | App Functionality |
| Photos or Videos | ✅ | ✅ | ❌ | App Functionality |
| Other User Content | ✅ | ✅ | ❌ | App Functionality |
| Coarse Location | ✅ | ✅ | ❌ | App Functionality |

> „Data Used to Track You": **žádné**. „Data Linked to You": výše. „Data Not Linked": žádné.

---

## 7. Age Rating (questionnaire)
- Doporučeno **4+** (případně 9+).
- UGC: ANO — v dotazníku uveď, že obsah je **moderovaný** a aplikace má **report + block + EULA s nulovou tolerancí** (Guideline 1.2).
- Unrestricted Web Access: **NE** (aplikace zobrazuje jen vlastní obsah fachmani.org, není to prohlížeč).
- Žádné násilí, hazard, explicitní obsah.

---

## 8. App Review Information (Notes for Reviewer)

> ⚠️ Vytvoř/ověř testovací účet a doplň přihlašovací údaje níže. Reviewer je bude potřebovat
> (jinak hrozí zamítnutí podle 2.1 kvůli nemožnosti otestovat funkce za přihlášením).

```
DEMO ÚČET (zákazník):
  E-mail: <doplň>
  Heslo:  <doplň>

DEMO ÚČET (řemeslník) — volitelné pro otestování nabídek:
  E-mail: <doplň>
  Heslo:  <doplň>

O APLIKACI
Fachmani je marketplace propojující zákazníky s ověřenými řemeslníky v ČR.
Aplikace je tenký nativní obal nad responzivním webem fachmani.org.

UŽIVATELSKÝ OBSAH — moderace (Guideline 1.2)
Aplikace obsahuje recenze, zprávy, příspěvky a profily. K dispozici je:
  • Nahlásit (🚩) — u recenzí, zpráv, profilů i příspěvků.
  • Blokovat (🚫) — u uživatelů (profil, chat, feed). Zablokovaný uživatel
    už nemůže psát zprávy a jeho obsah se skryje.
  • EULA s nulovou tolerancí potvrzuje uživatel při registraci.
Jak otestovat: otevřete profil libovolného fachmana → dole „Nahlásit profil" /
„Blokovat"; v recenzích → „Nahlásit"; v chatu (Zprávy) → v hlavičce „Blokovat"/„Nahlásit".

ÚČET A SMAZÁNÍ (Guideline 5.1.1(v))
Smazání účtu: Dashboard → sekce „Smazat účet" (trvale odstraní data).

PLATBY
Aplikace neobsahuje žádné nákupy ani platby — je plně zdarma.

PUSH
Aplikace žádá o povolení push notifikací pro upozornění na nové zprávy a nabídky.
```

---

## 9. Screenshots
- Povinné velikosti: **6.9"/6.7" (iPhone 16/15 Pro Max)** a **6.5"**. Stačí jedna sada, App Store dopočítá.
- Sada vygenerovaná s iOS markerem (bez ghost/seed/AI/cen) je v `mobile/assets/screenshots/` (viz skript `mobile/docs/`).
- Doporučené obrazovky: Domů, Katalog fachmanů, Detail profilu, Zadat poptávku, Zprávy/chat.

---

## 10. Build & Export Compliance
- `ITSAppUsesNonExemptEncryption = false` (už v Info.plist) → na otázku o šifrování odpověz **No**.
- Archive v Xcode → Distribute App → App Store Connect → Upload.
- Podrobně: `mobile/docs/SUBMIT_RUNBOOK.md`.
```
