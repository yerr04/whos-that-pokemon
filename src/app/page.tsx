"use client"
// src/pages/test.tsx
import { useState, useEffect, FormEvent } from 'react'
import {
  getPokemon,
  getSpecies,
  Pokemon,
} from '@/lib/pokeapi'
import Fuse from 'fuse.js'

type HintType =
  | 'bst'
  | 'region'
  | 'ability'
  | 'types'
  | 'cry'
  | 'silhouette'

// order in which hints unlock
const HINT_SEQUENCE: HintType[] = [
  'bst',
  'region',
  'ability',
  'types',
  'cry',
  'silhouette',
]
const MAX_GUESSES = HINT_SEQUENCE.length + 1 // initial blind + 6 hints

interface ParsedPokemonInfo {
  bst: number
  cryUrl: string
  region: string
  ability: string
  types: string[]
  silhouetteUrl: string
  pokedexEntry: string
}

function computeBST(p: Pokemon): number {
  return p.stats.reduce((sum, s) => sum + s.base_stat, 0)
}
function getCryUrl(name: string) {
  return `https://play.pokemonshowdown.com/audio/cries/${name}.mp3`
}
function mapGenerationToRegion(gen: string) {
  return (
    {
      'generation-i': 'Kanto',
      'generation-ii': 'Johto',
      'generation-iii': 'Hoenn',
      'generation-iv': 'Sinnoh',
      'generation-v': 'Unova',
      'generation-vi': 'Kalos',
      'generation-vii': 'Alola',
      'generation-viii': 'Galar',
      'generation-ix': 'Paldea',
    }[gen] || gen
  )
}
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function GameBoard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')  
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [guessesMade, setGuessesMade] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [win, setWin] = useState(false)
  
  // Debug mode toggle - set to true for formatting/testing
  const [debugMode, setDebugMode] = useState(false)

  // Load a random Pokémon on mount
  useEffect(() => {
    ;(async () => {
      try {
        const randomId = Math.floor(Math.random() * 1025) + 1
        const pokemon = await getPokemon(randomId)
        setTargetName(pokemon.name.toLowerCase())

        const species = await getSpecies(pokemon.id)

        setInfo({
          bst: computeBST(pokemon),
          cryUrl: getCryUrl(pokemon.name),
          region: mapGenerationToRegion(species.generation.name),
          ability: pokemon.abilities[0]?.ability.name ?? '—',
          types: pokemon.types
            .sort((a, b) => a.slot - b.slot)
            .map((t) => t.type.name),
          silhouetteUrl:
            pokemon.sprites.other['official-artwork'].front_default || '',
          pokedexEntry: species.flavor_text_entries.flavor_text,
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Allow approximate guesses using fuse.js
function isCloseMatch(guess: string, target: string): boolean {
  const fuse = new Fuse([target], {
    threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
    includeScore: true
  });
  
  const result = fuse.search(guess);
  return result.length > 0 && result[0].score! <= 0.4;
}

  // Handle each guess or skip
  function handleGuess(e: FormEvent) {
    e.preventDefault()
    if (win || guessesMade >= MAX_GUESSES) return

    setGuessesMade((g) => g + 1)
    if (isCloseMatch(currentGuess.toLowerCase(), targetName)) {
      setWin(true)
    }
    setCurrentGuess('')
  }
  // Uncomment the line below to show all hints for formatting purposes
  //const revealedHints = HINT_SEQUENCE;
  
  // Uncomment the line below and comment out the line above to bring back game function
  const revealedHints = debugMode 
    ? HINT_SEQUENCE 
    : win 
    ? HINT_SEQUENCE 
    : HINT_SEQUENCE.slice(0, guessesMade)

  if (loading) return <p className="text-center mt-8">Loading…</p>
  if (error)
    return (
      <p className="text-red-500 text-center mt-8">Error: {error}</p>
    )
  if (!info) return null

  return (
    <div className="max-w-3xl mx-auto mt-12 p-4 bg-[#1f2b3d] rounded-lg">
      {/* Debug toggle button - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="mb-4 px-3 py-1 bg-yellow-500 text-black rounded text-sm"
        >
          Debug: {debugMode ? 'ON' : 'OFF'}
        </button>
      )}

      {/* Base image container */}
      <div className="relative">
        <img
          src="/whos-that-pokemon.png"
          alt="Who's That Pokémon?"
          className="w-full"
        />

        {/* Show silhouette overlay on the image - revealed when won OR when silhouette hint is unlocked */}
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

      {/* Hints section - boxes below progress indicator */}
      <div className="mt-4 space-y-2">
        {revealedHints.filter(hint => hint !== 'silhouette').map((hint) => (
          <HintBlock key={hint} type={hint} info={info} />
        ))}
      </div>

      {/* Input / buttons / status */}
      <div className="mt-6 text-center">
        {win ? (
          <p className="text-green-600 font-bold">
            🎉 You got it in {guessesMade} guess
            {guessesMade > 1 ? 'es' : ''}! It was{' '}
            {capitalize(targetName)}.
          </p>
        ) : guessesMade >= MAX_GUESSES ? (
          <p className="text-red-600 font-bold">
            Game over! The answer was{' '}
            {capitalize(targetName)}.
          </p>
        ) : (
          <>
            <form
              onSubmit={handleGuess}
              className="flex space-x-2 justify-center"
            >
              <input
                value={currentGuess}
                onChange={(e) =>
                  setCurrentGuess(e.target.value)
                }
                id="GuessInput"
                placeholder="Who's that Pokémon?"
                className="bg-white rounded px-3 py-2 flex-grow text-black border-6 border-[#55c58d] focus:outline-none focus:ring-2 focus:ring-[#206d46] transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                GUESS
              </button>
            </form>
            <p className="mt-2 text-gray-400">
              {MAX_GUESSES - guessesMade}
              {' '} REMAINING GUESSES
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// Update HintBlock component styling for box format
function HintBlock({
  type,
  info,
  win = false, // Add win prop
}: {
  type: HintType
  info: ParsedPokemonInfo
  win?: boolean // Make it optional
}) {
  const commonCls =
    'bg-transparent border text-[#F2F2F2]-800 px-3 py-2 rounded-lg text-center'

  switch (type) {
    case 'bst':
      return (
        <div className={commonCls}>
          BST: {info.bst}
        </div>
      )
    case 'region':
      return (
        <div className={commonCls}>
          Region: {info.region}
        </div>
      )
    case 'ability':
      return (
        <div className={commonCls}>
          Ability: {capitalize(info.ability)}
        </div>
      )
    case 'types':
      return (
        <div className={`${commonCls} flex items-center justify-center space-x-2`}>
          <span>Type:</span>
          {info.types.map((t) => (
            <img
              key={t}
              src={`https://play.pokemonshowdown.com/sprites/types/${capitalize(
                t
              )}.png`}
              alt={t}
              className="w-12 h-4"
            />
          ))}
        </div>
      )
    case 'cry':
      return (
        <div className={`${commonCls} flex items-center justify-center space-x-2`}>

          <audio controls src={info.cryUrl} className="h-8" />
        </div>
      )
    case 'silhouette':
      return (
        <div className=" relative top-[13%] left-[7%] flex items-center">
          <img
            src={info.silhouetteUrl}
            id="pkmn"
            alt="silhouette"
            className="w-[40%] h-auto max-h-[60%] object-contain"
            style={{ filter: win ? 'brightness(100%)' : 'brightness(0%)' }}
          />
        </div>
      )
      
    default:
      return null
  }
}

