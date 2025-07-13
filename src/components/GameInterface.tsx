"use client"
import { FormEvent } from 'react'
import { HintBlock } from '@/components/HintBlock'
import { MAX_GUESSES } from '@/types/game'
import { capitalize } from '@/utils/pokemon'
import { ParsedPokemonInfo, HintType } from '@/types/game'

interface GameInterfaceProps {
  // Game state
  loading: boolean
  error: string | null
  info: ParsedPokemonInfo | null
  targetName: string
  guessesMade: number
  currentGuess: string
  setCurrentGuess: (guess: string) => void
  win: boolean
  completed: boolean
  revealedHints: HintType[]
  
  // Game actions
  handleGuess: () => void
  
  // Optional props for different modes
  guesses?: string[]
  pokemonId?: number
  timeUntilNext?: { hours: number; minutes: number; seconds: number }
  onNextPokemon?: () => void
  
  // Header content
  title: string
  subtitle?: string
  
  // Dev mode (optional)
  debugMode?: boolean
  setDebugMode?: (mode: boolean) => void
  resetGame?: () => void
}

export function GameInterface({
  loading,
  error,
  info,
  targetName,
  guessesMade,
  currentGuess,
  setCurrentGuess,
  win,
  completed,
  revealedHints,
  handleGuess,
  guesses,
  pokemonId,
  timeUntilNext,
  onNextPokemon,
  title,
  subtitle,
  debugMode,
  setDebugMode,
  resetGame
}: GameInterfaceProps) {

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleGuess()
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen">
      <img
        src="/assets/pokeball.svg"
        alt="Loading..."
        className="animate-spin w-8 h-auto"
      />
      <p className="text-white text-center mt-4">Searching tall grass...</p>
    </div>
  )

  if (error) return <p className="text-red-500 text-center mt-8">Error: {error}</p>
  if (!info) return null

  return (
    <div className="max-w-3xl mx-auto mt-12 p-4 bg-[#1f2b3d] rounded-lg">
      {/* Dev Mode Controls */}
      {process.env.NODE_ENV === 'development' && (debugMode !== undefined || resetGame) && (
        <div className="flex gap-2 mb-4">
          {setDebugMode && (
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="px-3 py-1 bg-yellow-500 text-black rounded text-sm"
            >
              Debug Mode: {debugMode ? 'ON' : 'OFF'}
            </button>
          )}
          {resetGame && (
            <button
              onClick={resetGame}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Reset Game
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#55c58d] mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-400">{subtitle}</p>
        )}
        {debugMode && (
          <p className="text-yellow-400 text-sm mt-1">
            DEBUG: {capitalize(targetName)}
          </p>
        )}
      </div>

      {/* Base image container */}
      <div className="relative">
        <img
          src="/assets/whos-that-pokemon.png"
          alt="Who's That Pokémon?"
          className="w-full"
        />
        <div className="absolute inset-0">
          {(revealedHints.includes('silhouette') || win) && (
            <HintBlock type="silhouette" info={info} win={win} />
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex w-full mt-2 gap-1">
        {Array.from({ length: MAX_GUESSES }, (_, index) => (
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

      {/* Hints */}
      <div className="mt-4 space-y-2">
        {revealedHints.filter(hint => hint !== 'silhouette').map((hint) => (
          <HintBlock key={hint} type={hint} info={info} />
        ))}
      </div>

      {/* Previous guesses (only if provided) */}
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

      {/* Input / Results */}
      <div className="mt-6 text-center">
        {completed ? (
          <div>
            {win ? (
              <div>
                <p className="text-green-600 font-bold mb-4">
                  🎉 You got it in {guessesMade} guess{guessesMade > 1 ? 'es' : ''}! 
                  It was {capitalize(targetName)}.
                </p>
                
                {/* Daily mode - show countdown */}
                {timeUntilNext && (
                  <div className="text-white mb-4">
                    <p>Come back tomorrow for the next challenge!</p>
                    <p className="text-sm text-gray-400">
                      Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                    </p>
                  </div>
                )}
                
                {/* Unlimited mode - show next button */}
                {onNextPokemon && (
                  <button
                    onClick={onNextPokemon}
                    className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
                  >
                    NEXT POKÉMON
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-red-600 font-bold mb-4">
                  Game over! The answer was {capitalize(targetName)}.
                </p>
                
                {/* Daily mode - show countdown */}
                {timeUntilNext && (
                  <div className="text-white mb-4">
                    <p>Better luck tomorrow!</p>
                    <p className="text-sm text-gray-400">
                      Next challenge in: {timeUntilNext.hours}h {timeUntilNext.minutes}m {timeUntilNext.seconds}s
                    </p>
                  </div>
                )}
                
                {/* Unlimited mode - show try again button */}
                {onNextPokemon && (
                  <button
                    onClick={onNextPokemon}
                    className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
                  >
                    TRY AGAIN
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="flex space-x-2 justify-center">
              <input
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                placeholder="Who's that Pokémon?"
                className="bg-white rounded px-3 py-2 flex-grow text-black border-6 border-[#55c58d] focus:outline-none focus:ring-2 focus:ring-[#206d46] transition-colors"
                disabled={completed}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors disabled:opacity-50"
                disabled={completed}
              >
                GUESS
              </button>
            </form>
            <p className="mt-2 text-gray-400">
              {MAX_GUESSES - guessesMade} guesses remaining
            </p>
          </>
        )}
      </div>
    </div>
  )
}