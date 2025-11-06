'use client'
import Squares from "@/components/Squares";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background canvas */}
      <div className="absolute inset-0">
        <Squares 
          speed={0.5} 
          squareSize={40}
          direction='diagonal' // up, down, left, right, diagonal
          borderColor='#508996ff'
          hoverFillColor='#222'
        />
      </div>

      {/* Foreground content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="animate-fly-in text-center text-white p-8 rounded-lg">
          <h1 className="text-6xl font-bold">Welcome to PokeNerdle!</h1>
          <p className="mt-3 opacity-80">Guess the Pokémon!</p>
          <div className="p-4 space-x-4">
              <Link
                href="/daily"
                className="w-24 rounded-full bg-cyan-500 px-4 py-2 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors"
              >
                Play Daily Challenge
              </Link>
              <Link
                href="/unlimited"
                className="w-24 rounded-full bg-cyan-500 px-4 py-2 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors"
              >
                Play Unlimited Mode
              </Link>
            </div>
        </div>
      </main>
    </div>
  )
}
