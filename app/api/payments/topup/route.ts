import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createComgatePayment, isTestMode } from '@/lib/comgate'

// Service-role klient pro zápis do `payments` — tabulka je RLS chráněná
// (write jen pro service_role). Uživatelská session by INSERT neprošla.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { amountKc } = await request.json()
    const amount = Number(amountKc)

    if (!Number.isInteger(amount) || amount < 100 || amount > 50000) {
      return NextResponse.json({ error: 'Neplatná částka (100-50000 Kč)' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

    const admin = adminClient()

    const { data: payment, error: payError } = await admin
      .from('payments')
      .insert({
        user_id: user.id,
        type: 'topup',
        amount_kc: amount,
        status: 'pending',
        is_test: isTestMode(),
      })
      .select()
      .single()

    if (payError || !payment) {
      return NextResponse.json({ error: 'Chyba pri vytvareni platby' }, { status: 500 })
    }

    const result = await createComgatePayment({
      priceKc: amount,
      refId: payment.id,
      email: user.email!,
      label: `Dobiti penezenky - ${amount} Kc`,
    })

    if (result.code !== 0) {
      await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    await admin
      .from('payments')
      .update({ comgate_trans_id: result.transId })
      .eq('id', payment.id)

    return NextResponse.json({
      paymentId: payment.id,
      redirectUrl: result.redirect,
    })
  } catch (error) {
    console.error('Topup error:', error)
    return NextResponse.json({ error: 'Interni chyba' }, { status: 500 })
  }
}
