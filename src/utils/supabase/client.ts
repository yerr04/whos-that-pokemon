"use client"

import { createBrowserClient } from '@supabase/ssr'

const isBrowser = typeof document !== 'undefined'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
    }
  )
}
