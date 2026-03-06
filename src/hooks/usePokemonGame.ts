// src/hooks/usePokemonGame.ts
import { useState, useEffect, useRef } from 'react'
import { useGameLogic } from './useGameLogic'
import { generateHintSequence } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'
import { HintType, Difficulty, DIFFICULTY_CONFIG } from '@/types/game'
import { useAuth } from './useAuth'
import { useSupabase } from '@/components/SupabaseProvider'
import { selectRandomPokemon } from '@/data/pokemonCategories'

export function usePokemonGame() {
  const gameLogic = useGameLogic()
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [hintSequence, setHintSequence] = useState<HintType[]>([])
  const [currentPokemonId, setCurrentPokemonId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const hasRecordedRef = useRef(false)

  const config = DIFFICULTY_CONFIG[difficulty]

  const loadNewPokemon = async (diff?: Difficulty) => {
    const activeDifficulty = diff ?? difficulty
    const activeConfig = DIFFICULTY_CONFIG[activeDifficulty]

    gameLogic.resetGame()
    hasRecordedRef.current = false
    
    const newHintSequence = generateHintSequence(activeDifficulty)
    setHintSequence(newHintSequence)
    
    const randomId = selectRandomPokemon()
    setCurrentPokemonId(randomId)
    await gameLogic.loadPokemonData(randomId, { maxGuesses: activeConfig.maxGuesses })
  }

  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    loadNewPokemon(newDifficulty)
  }

  const revealedHints = gameLogic.debugMode 
    ? hintSequence 
    : gameLogic.win 
    ? hintSequence 
    : hintSequence.slice(0, gameLogic.guessesMade)

  useEffect(() => {
    loadNewPokemon()
  }, [])

  useEffect(() => {
    const isCompleted = gameLogic.win || (gameLogic.guessesMade >= config.maxGuesses)
    
    if (isCompleted && !hasRecordedRef.current && currentPokemonId && user) {
      hasRecordedRef.current = true
      
      recordGameResult({
        mode: 'unlimited',
        pokemonId: currentPokemonId,
        guessesMade: gameLogic.guessesMade,
        hintsRevealed: Math.min(gameLogic.guessesMade, hintSequence.length),
        hintSequence,
        won: gameLogic.win,
        hintTypeOnWin: gameLogic.win ? hintSequence[Math.max(gameLogic.guessesMade - 1, 0)] : null,
        userId: user.id,
        supabase,
        difficulty,
      }).catch(err => {
        console.error('Failed to record game result:', err)
      })
    }
  }, [gameLogic.win, gameLogic.guessesMade, currentPokemonId, hintSequence, user, supabase, config.maxGuesses, difficulty])

  return {
    ...gameLogic,
    maxGuesses: config.maxGuesses,
    loadNewPokemon: () => loadNewPokemon(),
    revealedHints,
    difficulty,
    changeDifficulty,
  }
}
