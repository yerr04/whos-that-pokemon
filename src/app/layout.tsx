import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokéNerdle",
  description: "Play 'Who's That Pokémon?' with a twist! Guess the Pokémon based on strategic hints and stats.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/assets/pokeball.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SupabaseProvider initialSession={session}>
          <Navbar />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}