import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyComgatePayment } from '@/lib/comgate'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const transId = formData.get('transId') as string
    const refId = formData.get('refId') as string

    if (!transId || !refId) {
      return new NextResponse('Missing params', { status: 400 })
    }

    // ALWAYS verify payment status with ComGate API — never trust request params
    const verified = await verifyComgatePayment(transId)

    if (!verified || verified.status === 'ERROR') {
      console.error('[webhook] ComGate verification failed for transId:', transId)
      return new NextResponse('Verification failed', { status: 400 })
    }

    // Webhook volá Comgate server-to-server (žádná uživatelská session) →
    // service-role klient, jinak by RLS zablokovala zápis do payments/wallets.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', refId)
      .single()

    if (!payment) {
      // Don't reveal whether payment exists — generic error
      return new NextResponse('Invalid request', { status: 400 })
    }

    // Verify the transId matches what we stored during payment creation
    if (payment.comgate_trans_id && payment.comgate_trans_id !== transId) {
      console.error('[webhook] transId mismatch:', transId, 'expected:', payment.comgate_trans_id)
      return new NextResponse('Invalid request', { status: 400 })
    }

    if (verified.status === 'PAID') {
      // ATOMICKÝ CLAIM: jen JEDEN souběžný/retry webhook flipne pending→paid.
      // Side-effecty navazujeme na výsledek claimu (ne na stale payment.status z ř.31),
      // takže se připíšou právě jednou — ComGate webhook běžně retryuje.
      const { data: claimed } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          comgate_trans_id: transId,
        })
        .eq('id', payment.id)
        .eq('status', 'pending') // claim
        .select('id')

      if (!claimed || claimed.length === 0) {
        // už zpracováno (retry/souběh) → potvrdit 200, žádné side-effecty (stop retry)
        return new NextResponse('OK', { status: 200 })
      }

      if (payment.type === 'topup') {
        // Atomický credit (increment v DB) + get-or-create wallet + UNIQUE(payment_id) backstop.
        await supabase.rpc('credit_wallet', {
          p_user_id: payment.user_id,
          p_amount: payment.amount_kc,
          p_payment_id: payment.id,
          p_description: `Dobití peněženky - ${payment.amount_kc} Kč`,
        })
      } else if (payment.type === 'premium_initial') {
        const nextBilling = new Date()
        nextBilling.setMonth(nextBilling.getMonth() + 1)

        // UNIQUE(initial_payment_id) backstop → duplicitní webhook nevytvoří druhé premium.
        await supabase.from('premium_subscriptions').upsert(
          {
            user_id: payment.user_id,
            status: 'active',
            initial_payment_id: payment.id,
            comgate_init_trans_id: transId,
            next_billing_at: nextBilling.toISOString(),
          },
          { onConflict: 'initial_payment_id', ignoreDuplicates: true },
        )

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
        .eq('status', 'pending') // Only cancel if still pending
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('[webhook] Error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}
