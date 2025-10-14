import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request: { headers: request.headers },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const requiresAuth =
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/stats')

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  if (user && request.nextUrl.pathname.startsWith('/auth/sign-in')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
