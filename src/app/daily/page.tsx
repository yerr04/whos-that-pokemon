"use client"
import { GameInterface } from '@/components/GameInterface'
import { useDailyChallenge } from '@/hooks/useDailyChallenge'

export default function DailyChallenge() {
  const gameState = useDailyChallenge()

  return (
    <GameInterface
      {...gameState}
      title="Daily Challenge"
      subtitle={`Daily Pokémon #${gameState.pokemonId} • Resets at 10 AM EST`}
      guesses={gameState.guesses}
      timeUntilNext={gameState.timeUntilNext}
      debugMode={gameState.debugMode}
      setDebugMode={gameState.setDebugMode}
      resetGame={gameState.resetDailyChallenge}
    />
  )
}