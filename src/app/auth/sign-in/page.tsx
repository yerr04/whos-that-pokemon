import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import SignInClient from "./SignInClient"

export default async function SignInPage() {
  const supabase = await createClient()
  // Refresh the session so we can reliably determine if the user is still signed in.
  await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return <SignInClient />
}
