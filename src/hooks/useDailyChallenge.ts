// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { getDailyPokemonId, getTimeUntilNextChallenge, getTodaysDateKey } from '@/utils/dailyChallenge'
import { HintType, MAX_GUESSES } from '@/types/game'
import { createSeededRandom, generateHintSequence, isCloseMatch } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'

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

  // Generate deterministic hint sequence + RNG based on date+pokemon
  const makeDailyRandom = (dateKey: string, pokemonId: number) =>
    createSeededRandom(`${dateKey}:${pokemonId}`)

  const generateDailyHintSequence = (dateKey: string, pokemonId: number): HintType[] => {
    const rnd = makeDailyRandom(dateKey, pokemonId)
    return generateHintSequence(rnd)
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
      // For daily mode (not forceNewPokemon)
      pokemonId = getDailyPokemonId()
      const seededRandom = makeDailyRandom(todayKey, pokemonId)
      hintSequence = generateDailyHintSequence(todayKey, pokemonId)
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
    
    // Ensure move selection uses the same deterministic RNG
    await gameLogic.loadPokemonData(pokemonId, { random: makeDailyRandom(todayKey, pokemonId) })
  }

  // Override the base handle guess to include daily state
  const handleGuess = async () => {
    if (!gameState || gameState.completed) return

    const newGuessesMade = gameState.guessesMade + 1
    const isCorrect = isCloseMatch(gameLogic.currentGuess.toLowerCase(), gameLogic.targetName)
    
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
    
    // Record game result when completed
    if (isCorrect || newGuessesMade >= MAX_GUESSES) {
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
      }).catch(err => {
        console.error('Failed to record daily game result:', err)
      })
    }
    
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