export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { StatsDashboard } from "@/components/StatsDashboard"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/profile")
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 md:pt-28">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>
        <p className="mt-1 text-white/70">{user.email}</p>
      </div>
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Performance dashboard</h2>
        <StatsDashboard />
      </section>
    </div>
  )
}
