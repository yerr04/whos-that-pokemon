'use client'
import Squares from "@/components/Squares";
import Link from "next/link";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

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
      <main className="relative z-10 flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="animate-fly-in text-center text-white p-4 md:p-8 rounded-lg max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold">Welcome to PokeNerdle!</h1>
          <p className="mt-3 opacity-80">Guess the Pokémon!</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <MotionLink
                href="/daily"
                className="w-full sm:w-auto min-w-[200px] rounded-full bg-cyan-500 px-6 py-3 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Play Daily Challenge
              </MotionLink>
              <MotionLink
                href="/unlimited"
                className="w-full sm:w-auto min-w-[200px] rounded-full bg-cyan-500 px-6 py-3 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Play Unlimited Mode
              </MotionLink>
            </div>
        </div>
      </main>
    </div>
  )
}
