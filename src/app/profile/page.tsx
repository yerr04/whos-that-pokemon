export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  // Middleware already refreshed the session, so getSession() is sufficient
  // This avoids an extra getUser() call that could cause rate limiting
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/profile")
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <div className="space-y-2">
        <div>User ID: {user.id}</div>
        <div>Email: {user.email}</div>
      </div>
    </div>
  )
}
