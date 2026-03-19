// src/hooks/useGameLogic.ts
import { useRef, useState } from 'react'
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
  getFormCategory,
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
  const latestLoadIdRef = useRef(0)

  const loadPokemonData = async (pokemonId: number, opts?: LoadOptions) => {
    const loadId = ++latestLoadIdRef.current
    const isStale = () => loadId !== latestLoadIdRef.current
    const logStale = (stage: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `[useGameLogic] Discarded stale load #${loadId} for pokemonId=${pokemonId} at ${stage}; latest=${latestLoadIdRef.current}`,
        )
      }
    }

    setLoading(true)
    setError(null)
    if (opts?.maxGuesses) setMaxGuesses(opts.maxGuesses)

    try {
      const pokemon = await getPokemon(pokemonId)
      if (isStale()) {
        logStale('after getPokemon')
        return
      }

      // Use species URL to get the correct species ID (critical for form Pokemon)
      const speciesId = extractSpeciesId(pokemon.species.url)
      const species = await getSpecies(speciesId || pokemon.id)
      if (isStale()) {
        logStale('after getSpecies')
        return
      }
      const evolutionChain = species.evolution_chain?.url
        ? await getEvolutionChain(species.evolution_chain.url)
        : undefined
      if (isStale()) {
        logStale('after getEvolutionChain')
        return
      }

      // For form Pokemon, use the base species name for chain lookups
      const speciesName = isFormPokemon(pokemonId) ? species.name : undefined
      const baseSpeciesId = speciesId || pokemon.id
      const isMegaForm = isFormPokemon(pokemonId) && getFormCategory(pokemonId) === 'Mega'

      // Mega evolutions share their base species move pool in practice.
      // Keep Mega's own stats/types/abilities, but source "Can Learn" from base moves.
      let movePool = pokemon.moves
      if (isMegaForm) {
        const basePokemon = await getPokemon(baseSpeciesId)
        if (isStale()) {
          logStale('after base move-pool fetch')
          return
        }
        if (basePokemon.moves?.length) {
          movePool = basePokemon.moves
        }
      }

      const nextTargetName = pokemon.name.toLowerCase()
      const nextDisplayName = getDisplayName(pokemon.name, pokemonId)
      const nextInfo: ParsedPokemonInfo = {
        bst: computeBST(pokemon),
        cryUrl: getCryUrl(pokemon.name),
        region: mapGenerationToRegion(species.generation.name),
        ability: pokemon.abilities[0]?.ability.name ?? '—',
        types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        silhouetteUrl: pokemon.sprites.other['official-artwork'].front_default || '',
        pokedexEntry: getEnglishFlavorText(species.flavor_text_entries, species.name),
        move: getRandomMove(movePool, opts?.random),
        height: pokemon.height,
        weight: pokemon.weight,
        evolutionStage: getEvolutionStage(pokemon.name, evolutionChain, speciesName),
        evolutionMethod: getEvolutionMethod(pokemon.name, evolutionChain, speciesName),
        hasSplitEvolution: hasSplitEvolution(evolutionChain),
        specialStatus: getSpecialStatus(pokemonId, species, speciesId || pokemon.id),
        specialForms: getSpecialForms(pokemonId),
      }

      if (isStale()) {
        logStale('before commit')
        return
      }
      // Commit answer + hints together to avoid mixed state from overlapping loads.
      setTargetName(nextTargetName)
      setDisplayName(nextDisplayName)
      setInfo(nextInfo)
    } catch (err: any) {
      if (!isStale()) {
        console.error(err)
        setError(err.message)
      }
    } finally {
      if (!isStale()) {
        setLoading(false)
      }
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
