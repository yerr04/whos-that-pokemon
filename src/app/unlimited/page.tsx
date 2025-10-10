"use client"
import { GameInterface } from '@/components/GameInterface'
import { usePokemonGame } from '@/hooks/usePokemonGame'
import { MAX_GUESSES } from '@/types/game'

export default function UnlimitedMode() {
  const gameState = usePokemonGame()

  return (
    <GameInterface
      title="Unlimited Mode"
      loading={gameState.loading}
      error={gameState.error}
      info={gameState.info}
      targetName={gameState.targetName}
      guessesMade={gameState.guessesMade}
      currentGuess={gameState.currentGuess}
      setCurrentGuess={gameState.setCurrentGuess}
      win={gameState.win}
      completed={gameState.win || gameState.guessesMade >= MAX_GUESSES}
      revealedHints={gameState.revealedHints}
      handleGuess={gameState.handleGuess}
      debugMode={gameState.debugMode}
      setDebugMode={gameState.setDebugMode}
      onNextPokemon={gameState.loadNewPokemon}
    />
  )
}