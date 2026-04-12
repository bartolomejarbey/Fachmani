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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Always ensure profile exists — prevents foreign key errors on demands
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const fullName = user.user_metadata?.full_name || ''
          const role = user.user_metadata?.role || 'customer'

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
            console.error('Profile upsert error:', profileError)
          }

          if (role === 'provider') {
            const { error: providerError } = await supabase.from('provider_profiles').upsert({
              user_id: user.id,
            }, { onConflict: 'user_id' })

            if (providerError) {
              console.error('Provider profile upsert error:', providerError)
            }
          }
        }
      } catch (e) {
        console.error('Profile creation error:', e)
        // Continue to redirect even if profile creation fails
      }

      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(new URL('/auth/login?confirmed=true', request.url))
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url))
}
