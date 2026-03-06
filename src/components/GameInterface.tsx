"use client"
import { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { HintBlock } from '@/components/HintBlock'
import { PokemonAutocomplete } from '@/components/PokemonAutocomplete'
import { ParsedPokemonInfo, HintType, Difficulty } from '@/types/game'

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

  debugMode?: boolean
  setDebugMode?: (mode: boolean) => void
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
  debugMode,
  setDebugMode,
}: GameInterfaceProps) {

  const shownName = displayName || targetName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleGuess()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <img
          src="/assets/pokeball.svg"
          alt="loading"
          className="animate-spin w-8 h-auto"
        />
        <p className="text-white text-center mt-4">Searching tall grass...</p>
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
                Today&apos;s Difficulty: {DIFFICULTY_LABELS[difficulty]}
              </span>
            )}
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

        {/* Guess Progress Indicator */}
        <div className="flex w-full mt-2 gap-1">
          {Array.from({ length: maxGuesses }, (_, index) => (
            <div
              key={index}
              className={`flex-1 h-3 rounded ${
                index < guessesMade
                  ? win && index === guessesMade - 1
                    ? 'bg-green-500'
                    : 'bg-red-400'
                  : 'bg-gray-200 border border-gray-300'
              }`}
            />
          ))}
        </div>

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
              <p className="text-green-600 font-bold mb-4">
                You got it in {guessesMade} guess
                {guessesMade > 1 ? 'es' : ''}! It was{' '}
                {shownName}.
              </p>
              
              {timeUntilNext && (
                <div className="text-white mb-4">
                  <p>Come back tomorrow for the next challenge!</p>
                  <p className="text-sm text-gray-400">
                    Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                  </p>
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
              <p className="text-red-600 font-bold mb-4">
                Game over! The answer was {shownName}.
              </p>
              
              {timeUntilNext && (
                <div className="text-white mb-4">
                  <p>Better luck tomorrow!</p>
                  <p className="text-sm text-gray-400">
                    Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                  </p>
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
