import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = (nextParam.startsWith('/') && !nextParam.startsWith('//')) ? nextParam : '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    // In-memory cookie map so getAll() reflects cookies set by exchangeCodeForSession.
    // Without this, getAll() returns stale REQUEST cookies while setAll() writes to
    // the RESPONSE — meaning the Supabase client has no valid session for DB operations.
    const cookieMap = new Map<string, { name: string; value: string }>()
    cookieStore.getAll().forEach(c => cookieMap.set(c.name, { name: c.name, value: c.value }))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Array.from(cookieMap.values())
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieMap.set(name, { name, value })
              try { cookieStore.set(name, value, options) } catch {}
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Use user from exchangeCodeForSession directly — do NOT call getUser()
      // separately, because the cookie store may not reflect the new session yet.
      const user = data?.user
      console.log('[auth/callback] exchangeCodeForSession OK, user:', user?.id, user?.email)

      if (user) {
        const fullName = user.user_metadata?.full_name || ''
        const role = user.user_metadata?.role || 'customer'

        console.log('[auth/callback] upserting profile for', user.id, 'role:', role)

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: role,
          is_verified: false,
          subscription_type: 'free',
          monthly_offers_count: 0,
        }, { onConflict: 'id', ignoreDuplicates: false })

        if (profileError) {
          console.error('[auth/callback] Profile upsert FAILED:', profileError)
        } else {
          console.log('[auth/callback] Profile upsert OK')
        }

        if (role === 'provider') {
          // Check if provider_profile exists first — no unique constraint on user_id
          const { data: existing } = await supabase
            .from('provider_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (!existing) {
            const { error: providerError } = await supabase
              .from('provider_profiles')
              .insert({ user_id: user.id })

            if (providerError) {
              console.error('[auth/callback] Provider profile insert FAILED:', providerError)
            } else {
              console.log('[auth/callback] Provider profile insert OK')
            }
          } else {
            console.log('[auth/callback] Provider profile already exists')
          }
        }
      } else {
        console.error('[auth/callback] exchangeCodeForSession returned no user!')
      }

      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(new URL('/auth/login?confirmed=true', request.url))
      }

      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('[auth/callback] exchangeCodeForSession FAILED:', error)
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url))
}
