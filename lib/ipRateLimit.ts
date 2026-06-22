import { createHash } from "node:crypto";

/**
 * Best-effort in-memory per-IP rate-limit (per serverless instance). Brzdí anon abuse
 * drahých endpointů (AI tokeny, zakládání účtů). Pro plnou ochranu doplnit CAPTCHA/Turnstile.
 */
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const store = new Map<string, number[]>();

export function ipRateLimited(req: Request, bucket: string, max: number, windowMs = DEFAULT_WINDOW_MS): boolean {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "x";
  const key = `${bucket}:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  store.set(key, hits);
  if (store.size > 10000) {
    for (const [k, v] of store) if (v.every((t) => now - t >= windowMs)) store.delete(k);
  }
  return hits.length > max;
}
