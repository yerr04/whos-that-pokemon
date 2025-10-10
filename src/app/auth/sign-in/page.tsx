"use client"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button onClick={signInWithGoogle} className="px-4 py-2 bg-blue-600 text-white rounded">
        Continue with Google
      </button>
    </main>
  )
}