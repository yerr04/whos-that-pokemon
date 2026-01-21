import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import SignInClient from "./SignInClient"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }> | { redirectTo?: string }
}) {
  const supabase = await createClient()
  // Refresh the session so we can reliably determine if the user is still signed in.
  await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, redirect to their intended destination or profile
  if (user) {
    const params = searchParams instanceof Promise ? await searchParams : searchParams
    const redirectTo = params?.redirectTo
    const destination = redirectTo && redirectTo.startsWith("/") 
      ? redirectTo 
      : "/profile"
    redirect(destination)
  }

  return <SignInClient />
}
