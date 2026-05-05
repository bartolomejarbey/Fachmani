/**
 * _load-env.ts
 * ============
 * Tiny zero-dep loader: čte `.env.local` z rootu projektu a doplní hodnoty
 * do `process.env`, pokud tam ještě nejsou. Existující env vars mají přednost
 * (tj. CLI-passed `KEY=... npx tsx ...` přebije soubor).
 *
 * Použití v každém scriptu jako úplně první import:
 *   import "./_load-env";
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const parsed = parseEnvFile(readFileSync(path, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

// Načítáme v pořadí: .env, pak .env.local (lokální přebije).
const root = resolve(process.cwd());
loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));

// Aliasy: scripty čtou SUPABASE_URL, ale Next.js drží NEXT_PUBLIC_SUPABASE_URL.
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
