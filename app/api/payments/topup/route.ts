import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createComgatePayment, isTestMode } from '@/lib/comgate'

export async function POST(request: Request) {
  try {
    const { amountKc } = await request.json()

    if (!amountKc || amountKc < 100 || amountKc > 50000) {
      return NextResponse.json({ error: 'Neplatna castka (100-50000 Kc)' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        type: 'topup',
        amount_kc: amountKc,
        status: 'pending',
        is_test: isTestMode(),
      })
      .select()
      .single()

    if (payError || !payment) {
      return NextResponse.json({ error: 'Chyba pri vytvareni platby' }, { status: 500 })
    }

    const result = await createComgatePayment({
      priceKc: amountKc,
      refId: payment.id,
      email: user.email!,
      label: `Dobiti penezenky - ${amountKc} Kc`,
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
    console.error('Topup error:', error)
    return NextResponse.json({ error: 'Interni chyba' }, { status: 500 })
  }
}
