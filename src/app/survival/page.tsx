// use default game interface for now
"use client"
import { GameInterface } from '@/components/GameInterface'
import { usePokemonGame } from '@/hooks/usePokemonGame'
import { useEffect } from 'react'

export default function UnlimitedMode() {
  const gameState = usePokemonGame()

  // Load new Pokemon on mount
  useEffect(() => {
    gameState.loadNewPokemon()
  }, [])

  return (
    <GameInterface
      {...gameState}
      title="Classic Mode"
      subtitle="Unlimited guesses, unlimited fun!"
      onNextPokemon={gameState.loadNewPokemon}
      debugMode={gameState.debugMode}
      setDebugMode={gameState.setDebugMode}
    />
  )
}