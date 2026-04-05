import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createComgatePayment, isTestMode } from '@/lib/comgate'

const PREMIUM_PRICE_KC = 499

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

    const { data: existing } = await supabase
      .from('premium_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Jiz mas aktivni Premium predplatne' }, { status: 400 })
    }

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        type: 'premium_initial',
        amount_kc: PREMIUM_PRICE_KC,
        status: 'pending',
        is_test: isTestMode(),
      })
      .select()
      .single()

    if (payError || !payment) {
      return NextResponse.json({ error: 'Chyba' }, { status: 500 })
    }

    const result = await createComgatePayment({
      priceKc: PREMIUM_PRICE_KC,
      refId: payment.id,
      email: user.email!,
      label: 'Fachmani Premium - mesicni predplatne',
      initRecurring: true,
    })

    if (result.code !== 0) {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    await supabase
      .from('payments')
      .update({ comgate_trans_id: result.transId })
      .eq('id', payment.id)

    return NextResponse.json({
      paymentId: payment.id,
      redirectUrl: result.redirect,
    })
  } catch (error) {
    console.error('Premium error:', error)
    return NextResponse.json({ error: 'Interni chyba' }, { status: 500 })
  }
}
