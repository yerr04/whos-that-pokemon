'use client'
import GlareBackgroundContainer from "@/components/GlareBackgroundContainer";

export default function HomePage() {
  return (
    <GlareBackgroundContainer>
      <div className="animate-fly-in text-center text-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold">Welcome to PokeNerdle!</h1>
        <p className="mt-3 opacity-80">Guess the Pokémon!</p>
      </div>
    </GlareBackgroundContainer>
  )
}
