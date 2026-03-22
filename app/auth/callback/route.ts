import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  // Validate that next is a safe relative path (prevent open redirect)
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
      // After email confirmation, create profile from user metadata
      if (type === 'signup' || type === 'email') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const fullName = user.user_metadata?.full_name || ''
          const role = user.user_metadata?.role || 'customer'

          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: role,
          }, { onConflict: 'id' })

          if (role === 'provider') {
            await supabase.from('provider_profiles').upsert({
              user_id: user.id,
            }, { onConflict: 'user_id' })
          }
        }
        return NextResponse.redirect(new URL('/auth/login?confirmed=true', request.url))
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
  }
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
