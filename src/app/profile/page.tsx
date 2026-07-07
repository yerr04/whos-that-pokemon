export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ProfileCard } from "@/components/profile/ProfileCard"
import { AchievementsGrid } from "@/components/profile/AchievementsGrid"

export default async function ProfilePage() {
  const supabase = await createClient()
  // getUser() validates the token server-side; getSession() only decodes the
  // cookie and must never gate access.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/profile")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, avatar_url, full_name, created_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-24 pb-12 md:pt-28">
      <ProfileCard initialProfile={profile} />
      <AchievementsGrid />
    </div>
  )
}
