// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { useGameLogic } from './useGameLogic'
import { getTodaysDateKey, getTimeUntilNextChallenge } from '@/utils/dailyChallenge'
import { HintType, Difficulty, DIFFICULTY_CONFIG } from '@/types/game'
import { createSeededRandom, generateHintSequence, isCloseMatch } from '@/utils/pokemon'
import { recordGameResult } from '@/utils/stats'
import { recordGuestGame } from '@/utils/guestStats'
import { useAuth } from './useAuth'
import { useAchievements } from './useAchievements'
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

// Archive replays persist per-date so revisiting an old puzzle resumes it.
const storageKeyFor = (archiveDateKey?: string) =>
  archiveDateKey ? `${STORAGE_KEY}-archive-${archiveDateKey}` : STORAGE_KEY

/**
 * Daily challenge state.
 *
 * The puzzle is fully derived from a date key: the key seeds an RNG that
 * picks the Pokémon, difficulty and hint order, so every player sees the
 * same puzzle with zero server coordination. Passing `archiveDateKey` replays
 * a past date's puzzle the same way — the server records it under that
 * historical date (one play per date, enforced by a unique index) but only
 * counts *today's* date toward the streak.
 */
export function useDailyChallenge(archiveDateKey?: string) {
  const isArchive = !!archiveDateKey
  const gameLogic = useGameLogic()
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { checkAchievements } = useAchievements()
  const [gameState, setGameState] = useState<DailyGameState | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState(getTimeUntilNextChallenge())
  const [currentDateKey, setCurrentDateKey] = useState(
    archiveDateKey ?? getTodaysDateKey(),
  )
  const [streak, setStreak] = useState<number | undefined>(undefined)
  const [streakFreezes, setStreakFreezes] = useState<number | undefined>(undefined)
  const [newAchievements, setNewAchievements] = useState<string[]>([])

  // Reads the user's own daily streak + freezes (RLS allows reading own row).
  const fetchDailyStreak = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('user_mode_totals')
      .select('current_streak, streak_freezes')
      .eq('user_id', user.id)
      .eq('mode', 'daily')
      .maybeSingle()
    if (!error && data) {
      setStreak(data.current_streak)
      setStreakFreezes(data.streak_freezes ?? 0)
    }
  }

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
    const todayKey = archiveDateKey ?? getTodaysDateKey()
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

    const savedGame = localStorage.getItem(storageKeyFor(archiveDateKey))
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
        localStorage.removeItem(storageKeyFor(archiveDateKey))
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
        localStorage.removeItem(storageKeyFor(archiveDateKey))
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
    localStorage.setItem(storageKeyFor(archiveDateKey), JSON.stringify(newState))
    gameLogic.setCurrentGuess('')

    if (newState.completed && !gameState.devOverride) {
      if (user) {
        recordGameResult({
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
          supabase,
          difficulty: gameState.difficulty,
        })
          .then(async (summary) => {
            if (summary && !isArchive) {
              setStreak(summary.current_streak)
              setStreakFreezes(summary.streak_freezes)
            }
            const earned = await checkAchievements()
            if (earned.length > 0) setNewAchievements(earned)
          })
          .catch(err => {
            console.error('Failed to record daily game result:', err)
          })
      } else if (!isArchive) {
        // Guests keep stats locally; merged into the account on sign-up.
        const guestStats = recordGuestGame('daily', isCorrect, currentDateKey)
        if (isCorrect) setStreak(guestStats.streak)
      }
    }

    if (isCorrect) {
      gameLogic.handleGuess()
    }
  }

  const resetDailyChallenge = () => {
    localStorage.removeItem(storageKeyFor(archiveDateKey))
    gameLogic.resetGame()
    loadDailyChallenge(true)
  }

  const checkAndResetIfNewDay = () => {
    if (isArchive) return
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
    if (isArchive) return
    const timer = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextChallenge())
      checkAndResetIfNewDay()
    }, 1000)

    return () => clearInterval(timer)
  }, [currentDateKey, gameState, isArchive])

  useEffect(() => {
    loadDailyChallenge()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveDateKey])

  // When a signed-in user lands on an already-completed daily (e.g. revisiting
  // after winning), the DB already has today's streak, so read it directly.
  useEffect(() => {
    if (user && gameState?.completed && !isArchive) {
      fetchDailyStreak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, gameState?.dateKey])

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
    dateKey: currentDateKey,
    streak,
    streakFreezes,
    newAchievements,
    isArchive,
    resetDailyChallenge
  }
}
