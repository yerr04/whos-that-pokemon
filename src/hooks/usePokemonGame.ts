// src/hooks/usePokemonGame.ts
import { useState, useEffect, useRef } from 'react'
import { useGameLogic } from './useGameLogic'
import { HintType, generateHintSequence } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'
import { MAX_GUESSES } from '@/types/game'

export function usePokemonGame() {
  const gameLogic = useGameLogic()
  const [hintSequence, setHintSequence] = useState<HintType[]>([])
  const [currentPokemonId, setCurrentPokemonId] = useState<number | null>(null)
  const hasRecordedRef = useRef(false)

  const loadNewPokemon = async () => {
    gameLogic.resetGame()
    hasRecordedRef.current = false
    
    // Generate new random hint sequence
    const newHintSequence = generateHintSequence()
    setHintSequence(newHintSequence)
    
    // Randomly select a Pokemon ID between 1 and 1025
    const randomId = Math.floor(Math.random() * 1025) + 1
    setCurrentPokemonId(randomId)
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

  // Record game result when completed
  useEffect(() => {
    const isCompleted = gameLogic.win || (gameLogic.guessesMade >= MAX_GUESSES)
    
    if (isCompleted && !hasRecordedRef.current && currentPokemonId) {
      hasRecordedRef.current = true
      
      recordGameResult({
        mode: 'unlimited',
        pokemonId: currentPokemonId,
        guessesMade: gameLogic.guessesMade,
        hintsRevealed: Math.min(gameLogic.guessesMade, hintSequence.length),
        hintSequence,
        won: gameLogic.win,
        hintTypeOnWin: gameLogic.win ? hintSequence[Math.max(gameLogic.guessesMade - 1, 0)] : null,
      }).catch(err => {
        console.error('Failed to record game result:', err)
      })
    }
  }, [gameLogic.win, gameLogic.guessesMade, currentPokemonId, hintSequence])

  return {
    ...gameLogic,
    loadNewPokemon,
    revealedHints
  }
}