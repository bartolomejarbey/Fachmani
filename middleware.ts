import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Admin routes with required minimum role
const ADMIN_ROLE_HIERARCHY: Record<string, number> = {
  sales: 1,
  admin: 2,
  master_admin: 3,
}

// Routes that require specific admin roles (minimum level)
const ADMIN_ROUTE_ROLES: Record<string, string> = {
  '/admin/tym': 'master_admin',
  '/admin/activity': 'master_admin',
  '/admin/nastaveni': 'master_admin',
  '/admin/uzivatele': 'admin',
  '/admin/kategorie': 'admin',
  '/admin/transakce': 'admin',
  '/admin/faktury': 'admin',
}

function hasRole(userRole: string, requiredRole: string): boolean {
  return (ADMIN_ROLE_HIERARCHY[userRole] || 0) >= (ADMIN_ROLE_HIERARCHY[requiredRole] || 0)
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect /admin/* routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single()

    if (!profile?.admin_role) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Check granular role-based access for specific admin routes
    for (const [route, requiredRole] of Object.entries(ADMIN_ROUTE_ROLES)) {
      if (pathname.startsWith(route)) {
        if (!hasRole(profile.admin_role, requiredRole)) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
        break
      }
    }
  }

  // Protect /dashboard/* routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Protect /zpravy/* routes
  if (pathname.startsWith('/zpravy')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/zpravy/:path*'],
}
