import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PRICES: Record<string, number> = {
  offer_publish: 29,
  profile_boost_7d: 99,
  feed_boost_1d: 49,
}

const DESCRIPTIONS: Record<string, string> = {
  offer_publish: 'Publikace nabidky',
  profile_boost_7d: 'Topovani profilu (7 dni)',
  feed_boost_1d: 'Boost na feedu (1 den)',
}

export async function POST(request: Request) {
  try {
    const { type, relatedEntityId } = await request.json()

    if (!PRICES[type]) {
      return NextResponse.json({ error: 'Neznamy typ akce' }, { status: 400 })
    }

    const amount = PRICES[type]

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'Penezenka neexistuje' }, { status: 404 })
    }

    if (wallet.balance_kc < amount) {
      return NextResponse.json({
        error: 'Nedostatek kreditu',
        required: amount,
        balance: wallet.balance_kc,
        shortfall: amount - wallet.balance_kc,
      }, { status: 402 })
    }

    const newBalance = wallet.balance_kc - amount
    await supabase
      .from('wallets')
      .update({
        balance_kc: newBalance,
        total_spent_kc: wallet.total_spent_kc + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type,
      amount_kc: -amount,
      balance_after_kc: newBalance,
      description: DESCRIPTIONS[type],
      related_entity_id: relatedEntityId || null,
    })

    return NextResponse.json({
      success: true,
      newBalance,
      spent: amount,
    })
  } catch (error) {
    console.error('Spend error:', error)
    return NextResponse.json({ error: 'Interni chyba' }, { status: 500 })
  }
}
