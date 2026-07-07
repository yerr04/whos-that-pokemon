"use client"
import { FormEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HintBlock } from '@/components/HintBlock'
import { HPBar } from '@/components/HPBar'
import { PokemonAutocomplete } from '@/components/PokemonAutocomplete'
import { ShareButton } from '@/components/ShareButton'
import { DailyDistribution } from '@/components/DailyDistribution'
import { AchievementToast } from '@/components/AchievementToast'
import { ParsedPokemonInfo, HintType, Difficulty } from '@/types/game'
import { GENERATIONS } from '@/data/pokemonCategories'

interface GameInterfaceProps {
  loading: boolean
  error: string | null
  info: ParsedPokemonInfo | null
  targetName: string
  displayName?: string
  guessesMade: number
  currentGuess: string
  setCurrentGuess: (guess: string) => void
  win: boolean
  completed: boolean
  revealedHints: HintType[]
  maxGuesses: number

  handleGuess: () => void

  guesses?: string[]
  timeUntilNext?: { hours: number; minutes: number; seconds: number }
  onNextPokemon?: () => void

  title?: string
  subtitle?: string

  difficulty?: Difficulty
  changeDifficulty?: (d: Difficulty) => void

  /** Generation filter (unlimited mode); null = all generations */
  generation?: number | null
  changeGeneration?: (gen: number | null) => void

  debugMode?: boolean
  setDebugMode?: (mode: boolean) => void

  mode?: 'daily' | 'unlimited'
  dateKey?: string
  streak?: number
  /** Streak freezes currently held (signed-in daily players) */
  streakFreezes?: number
  /** Achievement ids unlocked by the game that just finished */
  newAchievements?: string[]
  /** True when replaying a past daily from the archive */
  isArchive?: boolean
  /** True when the player is not signed in (shows the save-your-streak CTA) */
  isGuest?: boolean
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-600 hover:bg-green-500',
  medium: 'bg-yellow-600 hover:bg-yellow-500',
  hard: 'bg-red-600 hover:bg-red-500',
}

export function GameInterface({
  loading,
  error,
  info,
  targetName,
  displayName,
  guessesMade,
  currentGuess,
  setCurrentGuess,
  win,
  completed,
  revealedHints,
  maxGuesses,
  handleGuess,
  guesses,
  timeUntilNext,
  onNextPokemon,
  title,
  subtitle,
  difficulty,
  changeDifficulty,
  generation,
  changeGeneration,
  debugMode,
  setDebugMode,
  mode,
  dateKey,
  streak,
  streakFreezes,
  newAchievements,
  isArchive,
  isGuest,
}: GameInterfaceProps) {

  const shownName = displayName || targetName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')

  const canShare = !!mode && !!difficulty && !isArchive
  const showDistribution = mode === 'daily' && !!dateKey && completed

  const guestCta = isGuest && mode === 'daily' && completed && !isArchive && (
    <div className="mx-auto mb-4 max-w-md rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3">
      <p className="text-sm text-white/90">
        {typeof streak === 'number' && streak > 1
          ? `🔥 You're on a ${streak}-day streak — sign in so it doesn't get lost!`
          : 'Sign in to save your streak and stats, and to appear on the leaderboard.'}
      </p>
      <Link
        href="/auth/sign-in?redirectTo=/daily"
        className="mt-2 inline-block rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-[#0d1a26] transition-colors hover:bg-cyan-400"
      >
        Sign in with Google
      </Link>
    </div>
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleGuess()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-1">
        <div className="relative">
          <img
            src="/assets/pokeball.svg"
            alt="loading"
            className="animate-pokeball-wobble w-12 h-auto drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
          />
          <div className="absolute inset-0 flex items-center justify-center animate-pokeball-sparkle pointer-events-none">
            <svg width="40" height="40" viewBox="0 0 40 40" className="text-yellow-300">
              <line x1="20" y1="2" x2="20" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="30" x2="20" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="20" x2="10" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="30" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="text-white text-center mt-3 text-sm">
          <span className="loading-dots">Searching tall grass</span>
        </p>
      </div>
    )
  }

  if (error) return <p className="text-red-500 text-center mt-8">Error: {error}</p>
  if (!info) return null

  return (
    <>
      <div className="max-w-3xl mx-auto mt-24 md:mt-28 p-4 rounded-lg shadow-lg animate-fly-in">
        {/* Debug toggle button */}
        {process.env.NODE_ENV === 'development' && setDebugMode !== undefined && (
          <div className="flex gap-2 mb-4">
            <motion.button
              onClick={() => setDebugMode(!debugMode)}
              className="px-3 py-1 bg-yellow-500 text-black rounded text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Dev Mode : {debugMode ? 'ON' : 'OFF'}
            </motion.button>
          </div>
        )}

        {/* Optional Header */}
        {(title || subtitle) && (
          <div className="text-center mb-6">
            {title && (
              <h1 className="text-3xl font-bold text-cyan-500 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-gray-400">{subtitle}</p>
            )}
          </div>
        )}

        {/* Difficulty selector (unlimited mode) or badge (daily mode) */}
        {difficulty && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {changeDifficulty ? (
              // Unlimited mode: interactive selector
              (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <motion.button
                  key={d}
                  onClick={() => changeDifficulty(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-colors ${
                    d === difficulty
                      ? DIFFICULTY_COLORS[d]
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {DIFFICULTY_LABELS[d]}
                </motion.button>
              ))
            ) : (
              // Daily mode: static badge
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white ${DIFFICULTY_COLORS[difficulty]}`}>
                {isArchive ? 'Difficulty' : "Today's Difficulty"}: {DIFFICULTY_LABELS[difficulty]}
              </span>
            )}
          </div>
        )}

        {/* Generation filter (unlimited mode) */}
        {changeGeneration && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <label htmlFor="gen-filter" className="text-sm text-gray-400">
              Generation:
            </label>
            <select
              id="gen-filter"
              value={generation ?? ''}
              onChange={(e) =>
                changeGeneration(e.target.value === '' ? null : Number(e.target.value))
              }
              className="rounded-full border border-white/15 bg-[#1f2b3d] px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All generations</option>
              {GENERATIONS.map((g) => (
                <option key={g.gen} value={g.gen}>
                  {g.label} · {g.region}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Base image container */}
        <div className="relative">
          <img
            src="/assets/whos-that-pokemon.png"
            alt="Who's That Pokémon?"
            className="w-full rounded-lg"
          />

          {/* Silhouette overlay */}
          <div className="absolute inset-0">
            {(revealedHints.includes('silhouette') || win) && (
              <HintBlock type="silhouette" info={info} win={win} />
            )}
          </div>
        </div>

        {/* HP Bar Guess Progress */}
        <HPBar remaining={maxGuesses - guessesMade} max={maxGuesses} win={win} />

        {/* Hints section */}
        <div className="mt-4 space-y-2 transition-discrete">
          {revealedHints.filter(hint => hint !== 'silhouette').map((hint, index) => (
            <HintBlock key={hint} type={hint} info={info} index={index} />
          ))}
        </div>

        {/* Previous guesses (only for Daily mode) */}
        {guesses && guesses.length > 0 && (
          <div className="mt-4 p-3 bg-[#2a3441] rounded">
            <h3 className="text-white font-semibold mb-2">Your Guesses:</h3>
            <div className="flex flex-wrap gap-2">
              {guesses.map((guess, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-[#1f2b3d] text-white rounded text-sm"
                >
                  {guess}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input / buttons / status */}
        <div className="mt-6 text-center">
          {win ? (
            <div>
              <AchievementToast ids={newAchievements ?? []} />

              <p className="text-green-600 font-bold mb-4">
                You got it in {guessesMade} guess
                {guessesMade > 1 ? 'es' : ''}! It was{' '}
                {shownName}.
              </p>

              {mode === 'daily' && !isArchive && typeof streak === 'number' && streak > 0 && (
                <motion.p
                  className="mb-4 text-lg font-bold text-amber-400"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  🔥 {streak} day streak!
                  {typeof streakFreezes === 'number' && streakFreezes > 0 && (
                    <span
                      className="ml-3 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-sm font-semibold text-cyan-300 align-middle"
                      title="Streak freezes cover missed days automatically. Earn one every 7-day streak (max 3)."
                    >
                      🧊 ×{streakFreezes}
                    </span>
                  )}
                </motion.p>
              )}

              {guestCta}

              {showDistribution && (
                <DailyDistribution
                  dateKey={dateKey!}
                  maxGuesses={maxGuesses}
                  myBucket={guessesMade}
                />
              )}

              {timeUntilNext && (
                <div className="text-white mb-4">
                  <p>Come back tomorrow for the next challenge!</p>
                  <p className="text-sm text-gray-400">
                    Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                  </p>
                  <p className="mt-2 text-sm">
                    <Link href="/daily/archive" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      Can&apos;t wait? Replay a past daily →
                    </Link>
                  </p>
                </div>
              )}

              {canShare && (
                <div className="mb-4 flex justify-center">
                  <ShareButton
                    mode={mode!}
                    win={win}
                    guessesMade={guessesMade}
                    maxGuesses={maxGuesses}
                    difficulty={difficulty!}
                    dateKey={dateKey}
                    streak={streak}
                  />
                </div>
              )}

              {onNextPokemon && (
                <motion.button
                  onClick={onNextPokemon}
                  className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  NEXT POKEMON
                </motion.button>
              )}
            </div>
          ) : guessesMade >= maxGuesses ? (
            <div>
              <AchievementToast ids={newAchievements ?? []} />

              <p className="text-red-600 font-bold mb-4">
                Game over! The answer was {shownName}.
              </p>

              {guestCta}

              {showDistribution && (
                <DailyDistribution
                  dateKey={dateKey!}
                  maxGuesses={maxGuesses}
                  myBucket="loss"
                />
              )}

              {timeUntilNext && (
                <div className="text-white mb-4">
                  <p>Better luck tomorrow!</p>
                  <p className="text-sm text-gray-400">
                    Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                  </p>
                  <p className="mt-2 text-sm">
                    <Link href="/daily/archive" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      Practice on a past daily →
                    </Link>
                  </p>
                </div>
              )}

              {canShare && (
                <div className="mb-4 flex justify-center">
                  <ShareButton
                    mode={mode!}
                    win={win}
                    guessesMade={guessesMade}
                    maxGuesses={maxGuesses}
                    difficulty={difficulty!}
                    dateKey={dateKey}
                    streak={streak}
                  />
                </div>
              )}

              {onNextPokemon && (
                <motion.button
                  onClick={onNextPokemon}
                  className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  TRY AGAIN
                </motion.button>
              )}
            </div>
          ) : (
            <>
              <PokemonAutocomplete
                value={currentGuess}
                onChange={setCurrentGuess}
                onSubmit={onSubmit}
              />
              <p className="mt-2 text-gray-400">
                {maxGuesses - guessesMade} REMAINING GUESSES
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
