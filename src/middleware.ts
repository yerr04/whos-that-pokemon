import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ["/profile", "/stats"]

const projectRefMatch =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)
const derivedSupabaseCookie = projectRefMatch
  ? `sb-${projectRefMatch[1]}-auth-token`
  : undefined

const FALLBACK_COOKIES = ["sb-access-token", "sb-refresh-token"]

function hasSupabaseSession(request: NextRequest) {
  // Check for Supabase SSR cookies - they use a pattern like sb-<project-ref>-auth-token
  // But also check for any cookie that starts with sb- and contains auth
  const allCookies = request.cookies.getAll()
  
  // Check for derived cookie name
  if (derivedSupabaseCookie) {
    const cookie = request.cookies.get(derivedSupabaseCookie)
    if (cookie && cookie.value) {
      return true
    }
  }

  // Check for any Supabase auth-related cookies
  const hasSupabaseAuthCookie = allCookies.some(
    cookie => cookie.name.startsWith('sb-') && 
              (cookie.name.includes('auth') || cookie.name.includes('token'))
  )
  
  if (hasSupabaseAuthCookie) {
    return true
  }

  // Fallback to old cookie names
  return FALLBACK_COOKIES.some(
    cookieName => {
      const cookie = request.cookies.get(cookieName)
      return cookie !== undefined && cookie.value !== undefined
    }
  )
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

// Export route protection logic for testing
export function handleRouteProtection(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  // Skip middleware for auth callback - it handles its own redirects
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next()
  }

  // Handle route protection - check for session cookies
  // Note: This is a lightweight check. The actual user verification happens
  // in the page components after middleware refreshes the session
  const authenticated = hasSupabaseSession(request)

  if (!authenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/sign-in"
    const redirectTo = `${pathname}${search}`
    if (redirectTo !== "/" && redirectTo !== "/auth/sign-in") {
      url.searchParams.set("redirectTo", redirectTo)
    }
    return NextResponse.redirect(url)
  }

  // If authenticated and on sign-in page, respect the redirectTo parameter
  if (authenticated && pathname.startsWith("/auth/sign-in")) {
    const redirectTo = new URLSearchParams(search).get("redirectTo")
    const url = request.nextUrl.clone()
    if (redirectTo && redirectTo.startsWith("/")) {
      url.pathname = redirectTo
      url.search = ""
    } else {
      url.pathname = "/"
      url.search = ""
    }
    return NextResponse.redirect(url)
  }

  return null // No redirect needed, continue to session refresh
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  // Skip auth callback - it handles its own session
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next()
  }

  // Create response first
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
  })

  // Refresh session - this also validates the session and refreshes tokens if needed
  // Use getSession() instead of getUser() to avoid extra API calls
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session?.user

  // Handle route protection based on actual session, not just cookies
  if (!isAuthenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/sign-in"
    const redirectTo = `${pathname}${search}`
    if (redirectTo !== "/" && redirectTo !== "/auth/sign-in") {
      url.searchParams.set("redirectTo", redirectTo)
    }
    return NextResponse.redirect(url)
  }

  // If authenticated and on sign-in page, redirect to intended destination
  if (isAuthenticated && pathname.startsWith("/auth/sign-in")) {
    const redirectTo = new URLSearchParams(search).get("redirectTo")
    const url = request.nextUrl.clone()
    if (redirectTo && redirectTo.startsWith("/")) {
      url.pathname = redirectTo
      url.search = ""
    } else {
      url.pathname = "/"
      url.search = ""
    }
    return NextResponse.redirect(url)
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
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
