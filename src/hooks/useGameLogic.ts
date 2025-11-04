// src/hooks/useGameLogic.ts
import { useState, useEffect } from 'react'
import { getPokemon, getSpecies, getEvolutionChain } from '@/lib/pokeapi'
import { computeBST, getCryUrl, mapGenerationToRegion, getEnglishFlavorText, getRandomMove, getEvolutionStage } from '@/utils/pokemon'
import { MAX_GUESSES, ParsedPokemonInfo } from '@/types/game'
import { isCloseMatch } from '@/utils/pokemon'
import { get } from 'http'

type LoadOptions = {
  random?: () => number // use seeded RNG for deterministic fields (e.g., move)
}

export function useGameLogic() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')  
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [guessesMade, setGuessesMade] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [win, setWin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Load Pokemon data for a specific ID
  const loadPokemonData = async (pokemonId: number, opts?: LoadOptions) => {
    setLoading(true)
    setError(null)

    try {
      const pokemon = await getPokemon(pokemonId)
      setTargetName(pokemon.name.toLowerCase())

      const species = await getSpecies(pokemon.id)
      const evolutionChain = species.evolution_chain?.url
        ? await getEvolutionChain(species.evolution_chain.url)
        : undefined

      setInfo({
        bst: computeBST(pokemon),
        cryUrl: getCryUrl(pokemon.name),
        region: mapGenerationToRegion(species.generation.name),
        ability: pokemon.abilities[0]?.ability.name ?? '—',
        types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        silhouetteUrl: pokemon.sprites.other['official-artwork'].front_default || '',
        pokedexEntry: getEnglishFlavorText(species.flavor_text_entries, pokemon.name), // pass name for redaction
        move: getRandomMove(pokemon.moves, opts?.random),
        height: pokemon.height,
        weight: pokemon.weight,
        evolutionStage: getEvolutionStage(pokemon.name, evolutionChain)
      } as any)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Reset game state
  const resetGame = () => {
    setGuessesMade(0)
    setCurrentGuess('')
    setWin(false)
  }

  // Handle guess submission
  const handleGuess = () => {
    if (win || guessesMade >= MAX_GUESSES) return

    setGuessesMade((g) => g + 1)
    if (isCloseMatch(currentGuess.toLowerCase(), targetName)) {
      setWin(true)
    }
    setCurrentGuess('')
  }

  return {
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
    loadPokemonData,
    resetGame,
    handleGuess
  }
}