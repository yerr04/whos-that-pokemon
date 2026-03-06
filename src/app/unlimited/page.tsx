"use client"
import { GameInterface } from '@/components/GameInterface'
import { usePokemonGame } from '@/hooks/usePokemonGame'

export default function UnlimitedMode() {
  const gameState = usePokemonGame()

  return (
    <GameInterface
      title="Unlimited Mode"
      loading={gameState.loading}
      error={gameState.error}
      info={gameState.info}
      targetName={gameState.targetName}
      displayName={gameState.displayName}
      guessesMade={gameState.guessesMade}
      currentGuess={gameState.currentGuess}
      setCurrentGuess={gameState.setCurrentGuess}
      win={gameState.win}
      completed={gameState.win || gameState.guessesMade >= gameState.maxGuesses}
      revealedHints={gameState.revealedHints}
      maxGuesses={gameState.maxGuesses}
      handleGuess={gameState.handleGuess}
      debugMode={gameState.debugMode}
      setDebugMode={gameState.setDebugMode}
      onNextPokemon={gameState.loadNewPokemon}
      difficulty={gameState.difficulty}
      changeDifficulty={gameState.changeDifficulty}
    />
  )
}
