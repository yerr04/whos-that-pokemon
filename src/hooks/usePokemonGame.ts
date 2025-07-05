// src/hooks/usePokemonGame.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { HintType, generateHintSequence } from '@/utils/pokemon'

export function usePokemonGame() {
  const gameLogic = useGameLogic()
  const [hintSequence, setHintSequence] = useState<HintType[]>([])

  const loadNewPokemon = async () => {
    gameLogic.resetGame()
    
    // Generate new random hint sequence
    const newHintSequence = generateHintSequence()
    setHintSequence(newHintSequence)
    
    // Randomly select a Pokemon ID between 1 and 1025
    const randomId = Math.floor(Math.random() * 1025) + 1
    await gameLogic.loadPokemonData(randomId)
  }

  // Use the randomized hint sequence
  const revealedHints = gameLogic.debugMode 
    ? hintSequence 
    : gameLogic.win 
    ? hintSequence 
    : hintSequence.slice(0, gameLogic.guessesMade)

  useEffect(() => {
    loadNewPokemon()
  }, [])

  return {
    ...gameLogic,
    loadNewPokemon,
    revealedHints
  }
}