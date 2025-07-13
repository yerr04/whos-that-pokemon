// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { getDailyPokemonId, getTimeUntilNextChallenge, getTodaysDateKey } from '@/utils/dailyChallenge'
import { HintType, MAX_GUESSES } from '@/types/game'
import { generateHintSequence } from '@/utils/pokemon'  // Fixed import

interface DailyGameState {
  dateKey: string
  pokemonId: number
  guessesMade: number
  guesses: string[]
  win: boolean
  completed: boolean
  hintSequence: HintType[]
  devOverride?: boolean
}

const STORAGE_KEY = 'daily-pokemon-game'

export function useDailyChallenge() {
  const gameLogic = useGameLogic()
  const [gameState, setGameState] = useState<DailyGameState | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState(getTimeUntilNextChallenge())
  const [currentDateKey, setCurrentDateKey] = useState(getTodaysDateKey())

  // Generate deterministic hint sequence based on date
  const generateDailyHintSequence = (dateKey: string): HintType[] => {
    const seed = dateKey.replace(/-/g, '') // YYYYMMDD
    let hash = parseInt(seed)
    
    const seededRandom = () => {
      hash = (hash * 1664525 + 1013904223) % Math.pow(2, 32)
      return (hash / Math.pow(2, 32))
    }
    
    // Use the same hint generation logic as unlimited mode
    return generateHintSequence(seededRandom)
  }

  // Load daily challenge
  const loadDailyChallenge = async (forceNewPokemon = false) => {
    const todayKey = getTodaysDateKey()
    let pokemonId: number
    let hintSequence: HintType[]
    
    if (forceNewPokemon) {
      // Use the same random generation as unlimited mode
      pokemonId = Math.floor(Math.random() * 1025) + 1
      hintSequence = generateHintSequence() // Truly random for dev
      console.log('Dev mode: forcing new random Pokemon ID:', pokemonId)
    } else {
      // Use deterministic daily Pokemon (same logic as unlimited but seeded)
      pokemonId = getDailyPokemonId()
      hintSequence = generateDailyHintSequence(todayKey)
      console.log('Daily Pokemon ID:', pokemonId, 'Hint sequence:', hintSequence)
    }
    
    // Load saved game state
    const savedGame = localStorage.getItem(STORAGE_KEY)
    let currentState: DailyGameState
    
    if (savedGame && !forceNewPokemon) {
      const parsed = JSON.parse(savedGame) as DailyGameState
      
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
          hintSequence,
          devOverride: false
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
        hintSequence,
        devOverride: forceNewPokemon
      }
      if (forceNewPokemon) {
        localStorage.removeItem(STORAGE_KEY)
      }
      console.log('First time playing or new Pokemon:', currentState)
    }
    
    setGameState(currentState)
    setCurrentDateKey(todayKey)
    
    // Load the Pokemon data using the same logic as unlimited mode
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
    gameLogic.resetGame()
    loadDailyChallenge(true)
  }

  // FIXED: Check for new day (always check, regardless of dev override)
  const checkAndResetIfNewDay = () => {
    const todayKey = getTodaysDateKey()
    if (currentDateKey !== todayKey) {
      console.log('Natural date change detected from', currentDateKey, 'to', todayKey)
      loadDailyChallenge(false)
    }
  }

  // Use the stored hint sequence (same logic as unlimited mode)
  const revealedHints = gameLogic.debugMode 
    ? gameState?.hintSequence || []
    : gameState?.win 
    ? gameState?.hintSequence || []
    : gameState?.hintSequence?.slice(0, gameState?.guessesMade || 0) || []

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