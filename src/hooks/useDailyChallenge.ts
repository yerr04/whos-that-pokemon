// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { getDailyPokemonId, getTimeUntilNextChallenge, getTodaysDateKey } from '@/utils/dailyChallenge'
import { HINT_SEQUENCE, MAX_GUESSES } from '@/types/game'

interface DailyGameState {
  dateKey: string
  pokemonId: number
  guessesMade: number
  guesses: string[]
  win: boolean
  completed: boolean
  devOverride?: boolean  // New field for dev mode
}

const STORAGE_KEY = 'daily-pokemon-game'

// Fixed sequence for daily challenge (6 hints + 1 free guess = 7 total)
const DAILY_HINT_SEQUENCE = [
  'bst',
  'region', 
  'ability',
  'types',
  'cry',
  'silhouette'
]

export function useDailyChallenge() {
  const gameLogic = useGameLogic()
  const [gameState, setGameState] = useState<DailyGameState | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState(getTimeUntilNextChallenge())
  const [currentDateKey, setCurrentDateKey] = useState(getTodaysDateKey())

  // Load daily challenge
  const loadDailyChallenge = async (forceNewPokemon = false) => {
    const todayKey = getTodaysDateKey()
    let pokemonId: number
    
    if (forceNewPokemon) {
      // Generate completely random Pokemon for dev mode
      pokemonId = Math.floor(Math.random() * 1025) + 1
      console.log('Dev mode: forcing new random Pokemon ID:', pokemonId)
    } else {
      // Use daily Pokemon
      pokemonId = getDailyPokemonId()
    }
    
    // Load saved game state
    const savedGame = localStorage.getItem(STORAGE_KEY)
    let currentState: DailyGameState
    
    if (savedGame && !forceNewPokemon) {
      const parsed = JSON.parse(savedGame) as DailyGameState
      
      // Check if it's a new day (ignore devOverride for natural resets)
      if (parsed.dateKey === todayKey) {
        currentState = parsed
        console.log('Loading existing daily challenge:', currentState)
      } else {
        // New day detected, reset game
        currentState = {
          dateKey: todayKey,
          pokemonId,
          guessesMade: 0,
          guesses: [],
          win: false,
          completed: false,
          devOverride: false // Reset dev override on new day
        }
        localStorage.removeItem(STORAGE_KEY)
        console.log('New day detected, resetting daily challenge:', currentState)
      }
    } else {
      // First time playing or forced new Pokemon
      currentState = {
        dateKey: todayKey,
        pokemonId,
        guessesMade: 0,
        guesses: [],
        win: false,
        completed: false,
        devOverride: forceNewPokemon
      }
      if (forceNewPokemon) {
        localStorage.removeItem(STORAGE_KEY)
      }
      console.log('First time playing or new Pokemon:', currentState)
    }
    
    setGameState(currentState)
    setCurrentDateKey(todayKey)
    
    // Load the Pokemon data
    await gameLogic.loadPokemonData(pokemonId)
  }

  // Override the base handle guess to include daily state
  const handleGuess = () => {
    if (!gameState || gameState.completed) return

    const newGuessesMade = gameState.guessesMade + 1
    const isCorrect = gameLogic.currentGuess.toLowerCase() === gameLogic.targetName
    
    const newState: DailyGameState = {
      ...gameState,
      guessesMade: newGuessesMade,
      guesses: [...gameState.guesses, gameLogic.currentGuess],
      win: isCorrect,
      completed: isCorrect || newGuessesMade >= MAX_GUESSES
    }
    
    setGameState(newState)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    console.log('Saving daily challenge state:', newState)
    gameLogic.setCurrentGuess('')
    
    if (isCorrect) {
      // Trigger win state in base hook
      gameLogic.handleGuess()
    }
  }

  // Reset daily challenge with NEW Pokemon (dev mode)
  const resetDailyChallenge = () => {
    console.log('Manually resetting daily challenge with NEW Pokemon')
    localStorage.removeItem(STORAGE_KEY)
    
    // Reset base game logic
    gameLogic.resetGame()
    
    // Load with force new Pokemon flag
    loadDailyChallenge(true)
  }

  // FIXED: Check for new day (always check, regardless of dev override)
  const checkAndResetIfNewDay = () => {
    const todayKey = getTodaysDateKey()
    if (currentDateKey !== todayKey) {
      console.log('Natural date change detected from', currentDateKey, 'to', todayKey)
      // Natural reset always uses daily Pokemon (not random)
      loadDailyChallenge(false)
    }
  }

  // Get revealed hints (use daily sequence, not full sequence)
  const revealedHints = gameLogic.debugMode 
    ? DAILY_HINT_SEQUENCE 
    : gameState?.win 
    ? DAILY_HINT_SEQUENCE 
    : DAILY_HINT_SEQUENCE.slice(0, gameState?.guessesMade || 0)

  // Update countdown and check for new day MORE FREQUENTLY
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextChallenge())
      checkAndResetIfNewDay()
    }, 1000) // Check every second
    
    return () => clearInterval(timer)
  }, [currentDateKey, gameState]) // Add gameState to dependencies

  // Load challenge on mount
  useEffect(() => {
    loadDailyChallenge()
  }, [])

  return {
    ...gameLogic,
    guessesMade: gameState?.guessesMade || 0,
    guesses: gameState?.guesses || [],
    win: gameState?.win || false,
    completed: gameState?.completed || false,
    handleGuess,
    revealedHints,
    timeUntilNext,
    pokemonId: gameState?.pokemonId || 0,
    resetDailyChallenge
  }
}