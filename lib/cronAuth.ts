import type { NextRequest } from "next/server";

/**
 * Autorizace cron endpointů. Vercel Cron posílá `Authorization: Bearer <CRON_SECRET>`.
 * Bez fallbacku na `?secret=` v query (ten leakuje do logů/Referer — audit hygiena).
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret");
  return !!provided && provided === secret;
}
