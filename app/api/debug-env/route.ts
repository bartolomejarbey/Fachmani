import { NextResponse } from 'next/server'
import { isTestMode } from '@/lib/comgate'

export const dynamic = 'force-dynamic'

// DOČASNÝ diagnostický endpoint (smazat po ověření). Chráněno query klíčem.
export async function GET(request: Request) {
  const k = new URL(request.url).searchParams.get('k')
  if (k !== 'fachmani-debug-2026') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({
    // runtime (function-level) čtení process.env
    runtime: {
      merchant_present: !!process.env.COMGATE_MERCHANT_ID,
      merchant_len: (process.env.COMGATE_MERCHANT_ID || '').length,
      secret_present: !!process.env.COMGATE_SECRET,
      test_mode_var: process.env.COMGATE_TEST_MODE ?? null,
      service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
    // module-level (lib/comgate) výsledek
    isTestMode: isTestMode(),
  })
}
