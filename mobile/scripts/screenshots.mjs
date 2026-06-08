// App Store screenshoty z produkce, jak je vidí iOS aplikace.
// Nastaví UA marker (server gating: ghost/seed/AI off) + zfalšuje window.Capacitor
// (client gating: skryté ceny/Ceník/ChatWidget). Výstup 1290×2796 (6.7").
//
// Spuštění:  node mobile/scripts/screenshots.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "screenshots");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.SS_BASE || "https://fachmani.org";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FachmaniApp-iOS";

// Zfalšuj Capacitor bridge → client-side isIOSNative()===true
// + předvyplň cookie souhlas (skryje banner přes obsah).
const CAPACITOR_SHIM = `
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    Plugins: { PushNotifications: {
      requestPermissions: async () => ({ receive: 'denied' }),
      register: async () => {}, addListener: async () => ({ remove(){} }), removeAllListeners: async () => {},
    } },
  };
  try {
    localStorage.setItem('fachmani-cookie-consent', JSON.stringify({
      version: 1, timestamp: '2026-06-08T00:00:00.000Z',
      categories: { necessary: true, analytics: false, marketing: false },
    }));
  } catch (e) {}
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: UA,
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "cs-CZ",
});
await ctx.addInitScript(CAPACITOR_SHIM);
const page = await ctx.newPage();

async function shot(name, url, { settle = 2500 } = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(settle);
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log("✓", name, "→", file);
}

// 1) Domů
await shot("01-home", "/");
// 2) Katalog fachmanů
await shot("02-katalog", "/fachmani");
// 3) Detail profilu — vezmi první reálný profil z katalogu
let profileHref = null;
try {
  await page.goto(`${BASE}/fachmani`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(1500);
  profileHref = await page.$$eval("a[href*='/fachman/']", (as) => {
    const a = as.find((x) => {
      const h = x.getAttribute("href") || "";
      return /\/fachman\/[0-9a-f-]{8,}/i.test(h) && !h.includes("/ghost/");
    });
    return a ? a.getAttribute("href") : null;
  });
} catch { /* ignore */ }
if (profileHref) await shot("03-profil", profileHref);
else console.log("⚠ žádný reálný profil v katalogu — přeskočeno 03-profil");

// 4) Kategorie
await shot("04-kategorie", "/kategorie");
// 5) Jak to funguje (hodnota pro zákazníka)
await shot("05-jak-to-funguje", "/jak-to-funguje");

// ---- Přihlášené obrazovky (demo zákazník) ----
const DEMO_EMAIL = process.env.SS_EMAIL || "appstore.review@fachmani.org";
const DEMO_PASS = process.env.SS_PASS || "FachmaniReview2026!";
let loggedIn = false;
try {
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.fill("input[type=email]", DEMO_EMAIL);
  await page.fill("input[type=password]", DEMO_PASS);
  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {}),
    page.click("button[type=submit]"),
  ]);
  await page.waitForTimeout(3000);
  loggedIn = !/\/auth\/login/.test(page.url());
  console.log(loggedIn ? "✓ přihlášen" : "⚠ přihlášení se nepovedlo (zůstáno na /auth/login)");
} catch (e) {
  console.log("⚠ login chyba:", e.message);
}

if (loggedIn) {
  // 6) Zadat poptávku (core flow, na iOS bez cen)
  await shot("06-nova-poptavka", "/nova-poptavka");
  // 7) Bezpečnost — karta „Kontaktovat" s Nahlásit profil / Blokovat (scroll na tlačítko)
  await page.goto(`${BASE}/fachman/453897f0-fc17-4aa7-9a1c-f693d50115f9`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  try {
    const target = page.getByText("Nahlásit profil", { exact: false }).first();
    await target.scrollIntoViewIfNeeded({ timeout: 5000 });
    // posuň o kus výš, ať je vidět celá karta Kontaktovat, ne footer
    await page.evaluate(() => window.scrollBy(0, -260));
  } catch {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.72));
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "07-bezpecnost.png") });
  console.log("✓ 07-bezpecnost");
}

await browser.close();
console.log("\nHotovo → ", OUT);
