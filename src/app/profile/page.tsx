import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <div>Profile Page - Protected Content</div>
}
