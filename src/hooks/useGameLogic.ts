// src/hooks/useGameLogic.ts
import { useState } from 'react'
import { getPokemon, getSpecies, getEvolutionChain } from '@/lib/pokeapi'
import {
  computeBST,
  getCryUrl,
  mapGenerationToRegion,
  getEnglishFlavorText,
  getRandomMove,
  getEvolutionStage,
  getEvolutionMethod,
  hasSplitEvolution,
  getDisplayName,
} from '@/utils/pokemon'
import { ParsedPokemonInfo } from '@/types/game'
import { isCloseMatch } from '@/utils/pokemon'
import {
  extractSpeciesId,
  getSpecialStatus,
  getSpecialForms,
  isFormPokemon,
} from '@/data/pokemonCategories'

type LoadOptions = {
  random?: () => number
  maxGuesses?: number
}

export function useGameLogic() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [guessesMade, setGuessesMade] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [win, setWin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [maxGuesses, setMaxGuesses] = useState(7)

  const loadPokemonData = async (pokemonId: number, opts?: LoadOptions) => {
    setLoading(true)
    setError(null)
    if (opts?.maxGuesses) setMaxGuesses(opts.maxGuesses)

    try {
      const pokemon = await getPokemon(pokemonId)
      setTargetName(pokemon.name.toLowerCase())
      setDisplayName(getDisplayName(pokemon.name, pokemonId))

      // Use species URL to get the correct species ID (critical for form Pokemon)
      const speciesId = extractSpeciesId(pokemon.species.url)
      const species = await getSpecies(speciesId || pokemon.id)
      const evolutionChain = species.evolution_chain?.url
        ? await getEvolutionChain(species.evolution_chain.url)
        : undefined

      // For form Pokemon, use the base species name for chain lookups
      const speciesName = isFormPokemon(pokemonId) ? species.name : undefined

      setInfo({
        bst: computeBST(pokemon),
        cryUrl: getCryUrl(pokemon.name),
        region: mapGenerationToRegion(species.generation.name),
        ability: pokemon.abilities[0]?.ability.name ?? '—',
        types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        silhouetteUrl: pokemon.sprites.other['official-artwork'].front_default || '',
        pokedexEntry: getEnglishFlavorText(species.flavor_text_entries, species.name),
        move: getRandomMove(pokemon.moves, opts?.random),
        height: pokemon.height,
        weight: pokemon.weight,
        evolutionStage: getEvolutionStage(pokemon.name, evolutionChain, speciesName),
        evolutionMethod: getEvolutionMethod(pokemon.name, evolutionChain, speciesName),
        hasSplitEvolution: hasSplitEvolution(evolutionChain),
        specialStatus: getSpecialStatus(pokemonId, species, speciesId || pokemon.id),
        specialForms: getSpecialForms(pokemonId),
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetGame = () => {
    setGuessesMade(0)
    setCurrentGuess('')
    setWin(false)
  }

  const handleGuess = () => {
    if (win || guessesMade >= maxGuesses) return

    setGuessesMade((g) => g + 1)

    // Match against both API name and display name
    const guess = currentGuess.toLowerCase()
    if (isCloseMatch(guess, targetName) || isCloseMatch(guess, displayName.toLowerCase())) {
      setWin(true)
    }
    setCurrentGuess('')
  }

  return {
    loading,
    error,
    targetName,
    displayName,
    info,
    guessesMade,
    currentGuess,
    setCurrentGuess,
    win,
    debugMode,
    setDebugMode,
    maxGuesses,
    loadPokemonData,
    resetGame,
    handleGuess
  }
}
