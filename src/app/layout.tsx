import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { createClient } from "@/utils/supabase/server";


export const metadata: Metadata = {
  title: "PokéNerdle",
  description: "Play 'Who's That Pokémon?' with a twist! Guess the Pokémon based on strategic hints and stats.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Refresh the session to ensure access tokens are up to date before asking for the user.
  await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/assets/pokeball.svg" type="image/svg+xml" />
      </head>
      <body>
        <SupabaseProvider initialUser={data.user}>
          {/* Pass the user to Navbar so SSR and client match */}
          <Navbar initialUser={data.user} />
          {children}
          <Analytics />
        </SupabaseProvider>
      </body>
    </html>
  );
}
