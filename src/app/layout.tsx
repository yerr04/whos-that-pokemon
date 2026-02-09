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
  let user = null;
  try {
    const supabase = await createClient();
    // Middleware handles session refresh, so we only need to get the user once
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase env vars may be missing during static prerendering (e.g. /_not-found)
  }

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/assets/pokeball.svg" type="image/svg+xml" />
      </head>
      <body>
        <SupabaseProvider initialUser={user ?? null}>
          {/* Pass the user to Navbar so SSR and client match */}
          {<Navbar initialUser={user ?? null} />}
          {/*<Nav />*/}
          {children}
          <Analytics />
        </SupabaseProvider>
      </body>
    </html>
  );
}
