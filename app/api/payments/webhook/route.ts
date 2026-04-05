import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyComgatePayment, isTestMode } from '@/lib/comgate'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const transId = formData.get('transId') as string
    const status = formData.get('status') as string
    const refId = formData.get('refId') as string

    if (!transId || !status) {
      return new NextResponse('Missing params', { status: 400 })
    }

    // In test mode, trust the status from the request; in prod, verify with ComGate
    const verified = isTestMode()
      ? { status: status === 'PAID' ? 'PAID' : status }
      : await verifyComgatePayment(transId)

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', refId)
      .single()

    if (!payment) {
      return new NextResponse('Payment not found', { status: 404 })
    }

    if (verified.status === 'PAID' && payment.status !== 'paid') {
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          comgate_trans_id: transId,
        })
        .eq('id', payment.id)

      if (payment.type === 'topup') {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', payment.user_id)
          .single()

        if (wallet) {
          const newBalance = wallet.balance_kc + payment.amount_kc
          await supabase
            .from('wallets')
            .update({
              balance_kc: newBalance,
              total_topped_up_kc: wallet.total_topped_up_kc + payment.amount_kc,
              updated_at: new Date().toISOString(),
            })
            .eq('id', wallet.id)

          await supabase.from('wallet_transactions').insert({
            wallet_id: wallet.id,
            user_id: payment.user_id,
            type: 'topup',
            amount_kc: payment.amount_kc,
            balance_after_kc: newBalance,
            description: `Dobiti penezenky - ${payment.amount_kc} Kc`,
            payment_id: payment.id,
          })
        }
      } else if (payment.type === 'premium_initial') {
        const nextBilling = new Date()
        nextBilling.setMonth(nextBilling.getMonth() + 1)

        await supabase.from('premium_subscriptions').insert({
          user_id: payment.user_id,
          status: 'active',
          initial_payment_id: payment.id,
          comgate_init_trans_id: transId,
          next_billing_at: nextBilling.toISOString(),
        })

        // Update profile subscription type
        await supabase
          .from('profiles')
          .update({ subscription_type: 'premium' })
          .eq('id', payment.user_id)
      }
    } else if (verified.status === 'CANCELLED') {
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', payment.id)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}
