// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { getTodaysDateKey, getTimeUntilNextChallenge } from '@/utils/dailyChallenge'
import { HintType, Difficulty, DIFFICULTY_CONFIG } from '@/types/game'
import { createSeededRandom, generateHintSequence, isCloseMatch } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'
import { useAuth } from './useAuth'
import { useSupabase } from '@/components/SupabaseProvider'
import { selectRandomPokemon } from '@/data/pokemonCategories'

interface DailyGameState {
  dateKey: string
  pokemonId: number
  guessesMade: number
  guesses: string[]
  win: boolean
  completed: boolean
  hintSequence: HintType[]
  difficulty: Difficulty
  devOverride?: boolean
}

const STORAGE_KEY = 'daily-pokemon-game'
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function useDailyChallenge() {
  const gameLogic = useGameLogic()
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [gameState, setGameState] = useState<DailyGameState | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState(getTimeUntilNextChallenge())
  const [currentDateKey, setCurrentDateKey] = useState(getTodaysDateKey())

  const makeDailyRandom = (dateKey: string, pokemonId: number) =>
    createSeededRandom(`${dateKey}:${pokemonId}`)

  /**
   * Derive a deterministic difficulty from the date seed.
   */
  const getDailyDifficulty = (dateKey: string): Difficulty => {
    const rng = createSeededRandom(`difficulty:${dateKey}`)
    return DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)]
  }

  /**
   * Pick a deterministic Pokemon ID using seeded weighted selection.
   */
  const getDailyPokemonId = (dateKey: string): number => {
    const rng = createSeededRandom(`pokemon:${dateKey}`)
    return selectRandomPokemon(rng)
  }

  const loadDailyChallenge = async (forceNewPokemon = false) => {
    const todayKey = getTodaysDateKey()
    let pokemonId: number
    let hintSequence: HintType[]
    let difficulty: Difficulty
    
    if (forceNewPokemon) {
      pokemonId = selectRandomPokemon()
      difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]
      hintSequence = generateHintSequence(difficulty)
    } else {
      pokemonId = getDailyPokemonId(todayKey)
      difficulty = getDailyDifficulty(todayKey)
      const seededRandom = makeDailyRandom(todayKey, pokemonId)
      hintSequence = generateHintSequence(difficulty, seededRandom)
    }

    const config = DIFFICULTY_CONFIG[difficulty]
    
    const savedGame = localStorage.getItem(STORAGE_KEY)
    let currentState: DailyGameState
    
    if (savedGame && !forceNewPokemon) {
      const parsed = JSON.parse(savedGame) as DailyGameState
      
      if (parsed.dateKey === todayKey) {
        // Backfill difficulty for saves from before the redesign
        currentState = { ...parsed, difficulty: parsed.difficulty || difficulty }
      } else {
        currentState = {
          dateKey: todayKey,
          pokemonId,
          guessesMade: 0,
          guesses: [],
          win: false,
          completed: false,
          hintSequence,
          difficulty,
          devOverride: false
        }
        localStorage.removeItem(STORAGE_KEY)
      }
    } else {
      currentState = {
        dateKey: todayKey,
        pokemonId,
        guessesMade: 0,
        guesses: [],
        win: false,
        completed: false,
        hintSequence,
        difficulty,
        devOverride: forceNewPokemon
      }
      if (forceNewPokemon) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    
    setGameState(currentState)
    setCurrentDateKey(todayKey)
    
    await gameLogic.loadPokemonData(pokemonId, {
      random: makeDailyRandom(todayKey, pokemonId),
      maxGuesses: config.maxGuesses,
    })
  }

  const handleGuess = async () => {
    if (!gameState || gameState.completed) return
    const config = DIFFICULTY_CONFIG[gameState.difficulty]

    const newGuessesMade = gameState.guessesMade + 1
    const guess = gameLogic.currentGuess.toLowerCase()
    const isCorrect =
      isCloseMatch(guess, gameLogic.targetName) ||
      isCloseMatch(guess, gameLogic.displayName.toLowerCase())
    
    const newState: DailyGameState = {
      ...gameState,
      guessesMade: newGuessesMade,
      guesses: [...gameState.guesses, gameLogic.currentGuess],
      win: isCorrect,
      completed: isCorrect || newGuessesMade >= config.maxGuesses
    }
    
    setGameState(newState)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    gameLogic.setCurrentGuess('')
    
    if ((isCorrect || newGuessesMade >= config.maxGuesses) && user) {
      await recordGameResult({
        mode: 'daily',
        pokemonId: gameState.pokemonId,
        guessesMade: newGuessesMade,
        hintsRevealed: Math.min(newGuessesMade, (gameState.hintSequence?.length ?? 0)),
        hintSequence: gameState.hintSequence,
        won: isCorrect,
        hintTypeOnWin: isCorrect
          ? gameState.hintSequence[Math.max(newGuessesMade - 1, 0)]
          : null,
        dailyDateKey: currentDateKey,
        userId: user.id,
        supabase,
        difficulty: gameState.difficulty,
      }).catch(err => {
        console.error('Failed to record daily game result:', err)
      })
    }
    
    if (isCorrect) {
      gameLogic.handleGuess()
    }
  }

  const resetDailyChallenge = () => {
    localStorage.removeItem(STORAGE_KEY)
    gameLogic.resetGame()
    loadDailyChallenge(true)
  }

  const checkAndResetIfNewDay = () => {
    const todayKey = getTodaysDateKey()
    if (currentDateKey !== todayKey) {
      loadDailyChallenge(false)
    }
  }

  const difficulty = gameState?.difficulty || 'medium'
  const config = DIFFICULTY_CONFIG[difficulty]

  const revealedHints = gameLogic.debugMode 
    ? gameState?.hintSequence || []
    : gameState?.win 
    ? gameState?.hintSequence || []
    : gameState?.hintSequence?.slice(0, gameState?.guessesMade || 0) || []

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextChallenge())
      checkAndResetIfNewDay()
    }, 1000)
    
    return () => clearInterval(timer)
  }, [currentDateKey, gameState])

  useEffect(() => {
    loadDailyChallenge()
  }, [])

  return {
    ...gameLogic,
    maxGuesses: config.maxGuesses,
    guessesMade: gameState?.guessesMade || 0,
    guesses: gameState?.guesses || [],
    win: gameState?.win || false,
    completed: gameState?.completed || false,
    handleGuess,
    revealedHints,
    timeUntilNext,
    pokemonId: gameState?.pokemonId || 0,
    difficulty,
    resetDailyChallenge
  }
}
