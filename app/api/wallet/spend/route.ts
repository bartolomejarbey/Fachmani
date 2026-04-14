import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PRICES: Record<string, number> = {
  offer_publish: 29,
  profile_boost_7d: 99,
  feed_boost_1d: 49,
}

const DESCRIPTIONS: Record<string, string> = {
  offer_publish: 'Publikace nabídky',
  profile_boost_7d: 'Topování profilu (7 dní)',
  feed_boost_1d: 'Boost na feedu (1 den)',
}

export async function POST(request: Request) {
  try {
    const { type, relatedEntityId } = await request.json()

    if (!PRICES[type]) {
      return NextResponse.json({ error: 'Neznámý typ akce' }, { status: 400 })
    }

    const amount = PRICES[type]

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Peněženka neexistuje' }, { status: 404 })
    }

    if (wallet.balance_kc < amount) {
      return NextResponse.json({
        error: 'Nedostatek kreditů',
        required: amount,
        balance: wallet.balance_kc,
        shortfall: amount - wallet.balance_kc,
      }, { status: 402 })
    }

    // Atomic update: only deduct if balance is still sufficient (prevents race condition)
    const newBalance = wallet.balance_kc - amount
    const { data: updated, error: updateError } = await supabase
      .from('wallets')
      .update({
        balance_kc: newBalance,
        total_spent_kc: wallet.total_spent_kc + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .gte('balance_kc', amount) // Only update if balance >= amount (atomic guard)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({
        error: 'Nedostatek kreditů (souběžná transakce)',
        required: amount,
      }, { status: 402 })
    }

    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type,
      amount_kc: -amount,
      balance_after_kc: updated.balance_kc,
      description: DESCRIPTIONS[type],
      related_entity_id: relatedEntityId || null,
    })

    return NextResponse.json({
      success: true,
      newBalance: updated.balance_kc,
      spent: amount,
    })
  } catch (error) {
    console.error('Spend error:', error)
    return NextResponse.json({ error: 'Interní chyba' }, { status: 500 })
  }
}
