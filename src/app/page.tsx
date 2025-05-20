"use client"
// src/pages/test.tsx

import { useEffect, useState } from 'react'
import {
  getPokemon,
  getSpecies,
  getEvolutionChain,
  Pokemon,
  Species,
} from '@/lib/pokeapi'

interface ParsedPokemonInfo {
  bst: number
  cryUrl: string
  region: string
  ability: string
  types: string[]
  silhouetteUrl: string
}

const MAX_POKEMON_ID = 1025

function computeBST(p: Pokemon): number {
  return p.stats.reduce((sum, s) => sum + s.base_stat, 0)
}

function getCryUrl(name: string): string {
  return `https://play.pokemonshowdown.com/audio/cries/${name}.mp3`
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function mapGenerationToRegion(genName: string): string {
  const map: Record<string, string> = {
    'generation-i':   'Kanto',
    'generation-ii':  'Johto',
    'generation-iii': 'Hoenn',
    'generation-iv':  'Sinnoh',
    'generation-v':   'Unova',
    'generation-vi':  'Kalos',
    'generation-vii': 'Alola',
    'generation-viii':'Galar',
    'generation-ix':  'Paldea',
  }
  return map[genName] || genName
}

export default function TestPage() {
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        // Pick a random ID from 1 to MAX_POKEMON_ID
        const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1

        // Fetch Pokémon, species, and evolution data
        const pokemon = await getPokemon(randomId)
        const species = await getSpecies(pokemon.id)
        await getEvolutionChain(species.evolution_chain.url)

        // Parse hints
        const bst = computeBST(pokemon)
        const cryUrl = getCryUrl(pokemon.name)
        const region = mapGenerationToRegion(species.generation.name)
        const ability = pokemon.abilities[0]?.ability.name ?? '—'
        const types = pokemon.types
          .sort((a, b) => a.slot - b.slot)
          .map(t => t.type.name)
        const silhouetteUrl =
          pokemon.sprites.other['official-artwork'].front_default || ''

        setInfo({ bst, cryUrl, region, ability, types, silhouetteUrl })
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p className="text-center mt-8">Loading random Pokémon…</p>
  if (error)   return <p className="text-red-500 text-center mt-8">Error: {error}</p>
  if (!info)  return null

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded-lg shadow">
      <h1 className="text-2xl mb-4 text-center">🎲 Random Pokémon Hints 🎲</h1>
      <div className="space-y-4">
        <div><strong>🔢 Base Stat Total:</strong> {info.bst}</div>
        
        <div><strong>🌍 Region:</strong> {info.region}</div>
        <div><strong>🛡️ Ability:</strong> {capitalize(info.ability)}</div>
        <div>
          <strong>🎨 Types:</strong>
          <div className="flex space-x-2 mt-2">
            {info.types.map(type => (
              <img
                key={type}
                src={`https://play.pokemonshowdown.com/sprites/types/${type[0].toUpperCase() + type.slice(1)}.png`}
                alt={type}
                className="w-14"
              />
            ))}
          </div>
        </div>
        <div>
          <strong>🔊 Cry:</strong><br/>
          <audio controls src={info.cryUrl} className="mt-1 w-full" />
        </div>
        {info.silhouetteUrl && (
          <div>
            <strong>👤 Silhouette:</strong><br/>
            <img
              src={info.silhouetteUrl}
              alt="Silhouette"
              className="mt-2 w-32 h-32"
              style={{ filter: 'brightness(0)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}