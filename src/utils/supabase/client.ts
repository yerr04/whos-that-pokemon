"use client"

import { createBrowserClient } from '@supabase/ssr'

const isBrowser = typeof document !== 'undefined'

export function createClient() {
  // Fall back to empty strings during static prerendering so
  // @supabase/ssr doesn't throw at build time (/_not-found etc.)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        if (!isBrowser) return []
        return document.cookie.split('; ').map(cookie => {
          const [name, ...rest] = cookie.split('=')
          return { name, value: decodeURIComponent(rest.join('=')) }
        })
      },
      setAll(cookiesToSet) {
        if (!isBrowser) return
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieString = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) {
            cookieString += `; Max-Age=${options.maxAge}`
          }
          if (options?.domain) {
            cookieString += `; Domain=${options.domain}`
          }
          if (options?.path) {
            cookieString += `; Path=${options.path}`
          }
          if (options?.sameSite) {
            cookieString += `; SameSite=${options.sameSite}`
          }
          if (options?.secure) {
            cookieString += `; Secure`
          }
          document.cookie = cookieString
        })
      },
    },
  })
}
