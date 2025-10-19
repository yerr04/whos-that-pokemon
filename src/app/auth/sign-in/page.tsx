import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import SignInClient from "./SignInClient"

export default async function SignInPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return <SignInClient />
}
