"use client"

import { motion } from "framer-motion"
import { createClient } from "@/utils/supabase/client"

export default function SignInClient() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get("redirectTo")
    const nextPath = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/"
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim()
    const callbackOrigin = configuredOrigin || window.location.origin
    const oauthRedirectTo = `${callbackOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectTo,
      },
    })

    if (error) {
      console.error("Sign in error:", error)
    }
  }

  return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          Continue with Google
        </motion.button>
      </main>
  )
}
