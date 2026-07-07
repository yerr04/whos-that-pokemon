// src/hooks/usePokemonGame.ts
import { useState, useEffect, useRef } from 'react'
import { useGameLogic } from './useGameLogic'
import { generateHintSequence } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'
import { recordGuestGame } from '@/utils/guestStats'
import { HintType, Difficulty, DIFFICULTY_CONFIG } from '@/types/game'
import { useAuth } from './useAuth'
import { useAchievements } from './useAchievements'
import { useSupabase } from '@/components/SupabaseProvider'
import { selectRandomPokemon } from '@/data/pokemonCategories'

export function usePokemonGame() {
  const gameLogic = useGameLogic()
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { checkAchievements } = useAchievements()
  const [hintSequence, setHintSequence] = useState<HintType[]>([])
  const [currentPokemonId, setCurrentPokemonId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  // null = all generations
  const [generation, setGeneration] = useState<number | null>(null)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const hasRecordedRef = useRef(false)

  const config = DIFFICULTY_CONFIG[difficulty]

  const loadNewPokemon = async (diff?: Difficulty, gen?: number | null) => {
    const activeDifficulty = diff ?? difficulty
    const activeConfig = DIFFICULTY_CONFIG[activeDifficulty]
    const activeGeneration = gen === undefined ? generation : gen

    gameLogic.resetGame()
    hasRecordedRef.current = false
    setNewAchievements([])

    const newHintSequence = generateHintSequence(activeDifficulty)
    setHintSequence(newHintSequence)

    const randomId = selectRandomPokemon(Math.random, activeGeneration)
    setCurrentPokemonId(randomId)
    await gameLogic.loadPokemonData(randomId, { maxGuesses: activeConfig.maxGuesses })
  }

  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    loadNewPokemon(newDifficulty)
  }

  const changeGeneration = (gen: number | null) => {
    setGeneration(gen)
    loadNewPokemon(undefined, gen)
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

    if (isCompleted && !hasRecordedRef.current && currentPokemonId) {
      hasRecordedRef.current = true

      if (user) {
        recordGameResult({
          mode: 'unlimited',
          pokemonId: currentPokemonId,
          guessesMade: gameLogic.guessesMade,
          hintsRevealed: Math.min(gameLogic.guessesMade, hintSequence.length),
          hintSequence,
          won: gameLogic.win,
          hintTypeOnWin: gameLogic.win ? hintSequence[Math.max(gameLogic.guessesMade - 1, 0)] : null,
          supabase,
          difficulty,
        })
          .then(async () => {
            const earned = await checkAchievements()
            if (earned.length > 0) setNewAchievements(earned)
          })
          .catch(err => {
            console.error('Failed to record game result:', err)
          })
      } else {
        // Guests keep stats locally; merged into the account on sign-up.
        recordGuestGame('unlimited', gameLogic.win)
      }
    }
  }, [gameLogic.win, gameLogic.guessesMade, currentPokemonId, hintSequence, user, supabase, config.maxGuesses, difficulty, checkAchievements])

  return {
    ...gameLogic,
    maxGuesses: config.maxGuesses,
    loadNewPokemon: () => loadNewPokemon(),
    revealedHints,
    difficulty,
    changeDifficulty,
    generation,
    changeGeneration,
    newAchievements,
  }
}
