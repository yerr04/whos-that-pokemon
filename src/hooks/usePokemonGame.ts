import { useState, useEffect } from 'react'
import { getPokemon, getSpecies } from '@/lib/pokeapi'
import { ParsedPokemonInfo, HINT_SEQUENCE, MAX_GUESSES } from '@/types/game'
import { computeBST, getCryUrl, mapGenerationToRegion, isCloseMatch } from '@/utils/pokemon'

export function usePokemonGame() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')  
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [guessesMade, setGuessesMade] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [win, setWin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  const loadNewPokemon = async () => {
    setLoading(true)
    setError(null)
    setGuessesMade(0)
    setCurrentGuess('')
    setWin(false)
    
    try {
      // Randomly select a Pokemon ID between pokedex number 1 and 1025
      const randomId = Math.floor(Math.random() * 1025) + 1
      // Fetch pokemon data
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

  // Debug mode reveals all hints (will remove in prod)
  const revealedHints = debugMode 
    ? HINT_SEQUENCE 
    : win 
    ? HINT_SEQUENCE 
    : HINT_SEQUENCE.slice(0, guessesMade)

  useEffect(() => {
    loadNewPokemon()
  }, [])

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
    loadNewPokemon,
    handleGuess,
    revealedHints
  }
}