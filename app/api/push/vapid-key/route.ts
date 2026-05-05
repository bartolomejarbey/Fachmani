import { NextResponse } from "next/server";
import { getPublicKey } from "@/lib/push/vapid";

export const runtime = "nodejs";

// GET /api/push/vapid-key
// Vrací VAPID public key pro client-side subscribe call.
// Server-side jediný zdroj pravdy o klíči — vyhneme se NEXT_PUBLIC_ rebuild loop.

export async function GET() {
  const key = getPublicKey();
  if (!key) {
    return NextResponse.json({ error: "VAPID_PUBLIC_KEY není nastaven na serveru" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: key });
}
