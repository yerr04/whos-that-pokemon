"use client"
import { FormEvent } from 'react'
import { HintBlock } from '@/components/HintBlock'
import { usePokemonGame } from '@/hooks/usePokemonGame'
import { MAX_GUESSES } from '@/types/game'
import { capitalize } from '@/utils/pokemon'

export default function GameBoard() {
  const {
    loading,
    error,
    targetName,
    info,
    guessesMade,
    currentGuess,
    setCurrentGuess,
    win,
    debugMode,
    setDebugMode,
    loadNewPokemon,
    handleGuess,
    revealedHints
  } = usePokemonGame()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleGuess()
  }

  if (loading) return <p className="text-center mt-8">Loading…</p>
  if (error) return <p className="text-red-500 text-center mt-8">Error: {error}</p>
  if (!info) return null

  return (
    <div className="max-w-3xl mx-auto mt-12 p-4 bg-[#1f2b3d] rounded-lg">
      {/* Debug toggle button */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="mb-4 px-3 py-1 bg-yellow-500 text-black rounded text-sm"
        >
          Dev Mode : {debugMode ? 'ON' : 'OFF'}
        </button>
      )}

      {/* Base image container */}
      <div className="relative">
        <img
          src="/whos-that-pokemon.png"
          alt="Who's That Pokémon?"
          className="w-full"
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

      {/* Hints section */}
      <div className="mt-4 space-y-2">
        {revealedHints.filter(hint => hint !== 'silhouette').map((hint) => (
          <HintBlock key={hint} type={hint} info={info} />
        ))}
      </div>

      {/* Input / buttons / status */}
      <div className="mt-6 text-center">
        {win ? (
          <div>
            <p className="text-green-600 font-bold mb-4">
              🎉 You got it in {guessesMade} guess
              {guessesMade > 1 ? 'es' : ''}! It was{' '}
              {capitalize(targetName)}.
            </p>
            <button
              onClick={loadNewPokemon}
              className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
            >
              NEXT POKÉMON
            </button>
          </div>
        ) : guessesMade >= MAX_GUESSES ? (
          <div>
            <p className="text-red-600 font-bold mb-4">
              Game over! The answer was {capitalize(targetName)}.
            </p>
            <button
              onClick={loadNewPokemon}
              className="px-6 py-3 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="flex space-x-2 justify-center">
              <input
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                placeholder="Who's that Pokémon?"
                className="bg-white rounded px-3 py-2 flex-grow text-black border-6 border-[#55c58d] focus:outline-none focus:ring-2 focus:ring-[#206d46] transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors"
              >
                GUESS
              </button>
            </form>
            <p className="mt-2 text-gray-400">
              {MAX_GUESSES - guessesMade} REMAINING GUESSES
            </p>
          </>
        )}
      </div>
    </div>
  )
}