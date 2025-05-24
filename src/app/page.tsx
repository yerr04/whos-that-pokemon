"use client"
// src/pages/test.tsx
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useState, useEffect, FormEvent } from 'react'
import {
  getPokemon,
  getSpecies,
  getEvolutionChain,
  Pokemon,
} from '@/lib/pokeapi'

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

  // 1️⃣ Load a random Pokémon on mount
  useEffect(() => {
    ;(async () => {
      try {
        const randomId = Math.floor(Math.random() * 1025) + 1
        const pokemon = await getPokemon(randomId)
        setTargetName(pokemon.name.toLowerCase())

        const species = await getSpecies(pokemon.id)
        await getEvolutionChain(species.evolution_chain.url)

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
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 2️⃣ Handle each guess or skip
  function handleGuess(e: FormEvent) {
    e.preventDefault()
    if (win || guessesMade >= MAX_GUESSES) return

    setGuessesMade((g) => g + 1)
    if (currentGuess.trim().toLowerCase() === targetName) {
      setWin(true)
    }
    setCurrentGuess('')
  }

  // which hints to show so far (cumulative)
// after: reveal the first hint as soon as guessesMade === 1
const revealedHints = HINT_SEQUENCE.slice(0, guessesMade)


  if (loading) return <p className="text-center mt-8">Loading…</p>
  if (error)
    return (
      <p className="text-red-500 text-center mt-8">Error: {error}</p>
    )
  if (!info) return null

  return (
    <div className="max-w-md mx-auto mt-12 p-4">
      {/* 3️⃣ Base image container with hints overlay */}
      <div className="relative">
        <img
          src="/whos-that-pokemon.png"
          alt="Who's That Pokémon?"
          className="w-full"
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 px-2">
          {revealedHints.map((hint) => (
            <HintBlock key={hint} type={hint} info={info} />
          ))}
        </div>
      </div>

      {/* 4️⃣ Input / buttons / status */}
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
                placeholder="Who's that Pokémon?"
                className="border rounded px-3 py-2 flex-grow"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Guess
              </button>
              <button
                type="button"
                onClick={() =>
                  setGuessesMade((g) => g + 1)
                }
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Skip
              </button>
            </form>
            <p className="mt-2">
              Remaining guesses:{' '}
              {MAX_GUESSES - guessesMade}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// 5️⃣ Renders a single hint block, styled to stand out over the image
function HintBlock({
  type,
  info,
}: {
  type: HintType
  info: ParsedPokemonInfo
}) {
  const commonCls =
    'bg-black bg-opacity-60 text-white px-2 py-1 rounded'

  switch (type) {
    case 'bst':
      return (
        <div className={commonCls}>
          🔢 BST: {info.bst}
        </div>
      )
    case 'region':
      return (
        <div className={commonCls}>
          🌍 Region: {info.region}
        </div>
      )
    case 'ability':
      return (
        <div className={commonCls}>
          🛡️ Ability: {capitalize(info.ability)}
        </div>
      )
    case 'types':
      return (
        <div
          className={[
            commonCls,
            'flex space-x-1 bg-transparent',
          ].join(' ')}
        >
          {info.types.map((t) => (
            <img
              key={t}
              src={`https://play.pokemonshowdown.com/sprites/types/${capitalize(
                t
              )}.png`}
              alt={t}
              className="w-14"
            />
          ))}
        </div>
      )
    case 'cry':
      return (
        <div className={commonCls + ' flex items-center'}>
          🔊 <audio controls src={info.cryUrl} />
        </div>
      )
    case 'silhouette':
      return (
        <img
          src={info.silhouetteUrl}
          alt="silhouette"
          className="w-32 h-32"
          style={{ filter: 'brightness(0)' }}
        />
      )
    default:
      return null
  }
}
