import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Service-role klient pro zápis do wallets/wallet_transactions (RLS: jen service_role).
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// TODO: Tyto ceny duplikují system_settings.pricing — admin změna v UI nezasáhne
// API. Prozatím držet v sync ručně, nebo přepnout na fetch ze system_settings.
const PRICES: Record<string, number> = {
  offer_publish: 29,
  profile_boost_7d: 99,
  feed_boost_1d: 49,
  urgent_request: 100,
  extra_request: 50,
}

const DESCRIPTIONS: Record<string, string> = {
  offer_publish: 'Publikace nabídky',
  profile_boost_7d: 'Topování profilu (7 dní)',
  feed_boost_1d: 'Boost na feedu (1 den)',
  urgent_request: 'Prioritní poptávka',
  extra_request: 'Extra poptávka navíc (denní limit)',
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

    const admin = adminClient()

    const { data: wallet } = await admin
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
    const { data: updated, error: updateError } = await admin
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

    await admin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type,
      amount_kc: -amount,
      balance_after_kc: updated.balance_kc,
      description: DESCRIPTIONS[type],
      related_entity_id: relatedEntityId || null,
    })

    // Pro extra_request povolíme jednu poptávku navíc dnes (nadrámec daily limitu).
    // Bez tohoto volání by trigger check_customer_request_limit nadále blokoval insert.
    if (type === 'extra_request') {
      await admin.rpc('grant_extra_request', { p_user_id: user.id })
    }

    // Prioritu nastavujeme SERVER-SIDE (service-role) — klient is_urgent nesmí (trigger
    // lock_request_privileged_columns). Ověříme vlastnictví poptávky.
    if (type === 'urgent_request' && relatedEntityId) {
      const { data: req } = await admin
        .from('requests')
        .select('id, user_id')
        .eq('id', relatedEntityId)
        .single()
      if (req && req.user_id === user.id) {
        await admin
          .from('requests')
          .update({ is_urgent: true, urgent_paid_at: new Date().toISOString() })
          .eq('id', relatedEntityId)
      }
    }

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
