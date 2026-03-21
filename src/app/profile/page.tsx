export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ProfileCard } from "@/components/profile/ProfileCard"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/profile")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, avatar_url, full_name, created_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 md:pt-28">
      <ProfileCard initialProfile={profile} />
    </div>
  )
}
