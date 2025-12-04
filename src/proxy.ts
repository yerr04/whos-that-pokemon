import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/profile", "/stats"]

const projectRefMatch =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)
const derivedSupabaseCookie = projectRefMatch
  ? `sb-${projectRefMatch[1]}-auth-token`
  : undefined

const FALLBACK_COOKIES = ["sb-access-token", "sb-refresh-token"]

function hasSupabaseSession(request: NextRequest) {
  if (
    derivedSupabaseCookie &&
    request.cookies.get(derivedSupabaseCookie) !== undefined
  ) {
    return true
  }

  return FALLBACK_COOKIES.some(
    cookieName => request.cookies.get(cookieName) !== undefined
  )
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
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

  if (authenticated && pathname.startsWith("/auth/sign-in")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
