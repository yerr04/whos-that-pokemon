"use client"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import GlareBackgroundContainer from "@/components/GlareBackgroundContainer"

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <GlareBackgroundContainer>
      <main className="min-h-screen flex items-center justify-center">
        <button 
          onClick={signInWithGoogle} 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Continue with Google
        </button>
      </main>
    </GlareBackgroundContainer>
  )
}