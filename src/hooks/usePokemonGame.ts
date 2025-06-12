import { useState, useEffect } from 'react'
import { getPokemon, getSpecies, getEvolutionChain } from '@/lib/pokeapi'
import { ParsedPokemonInfo, RANDOMIZABLE_HINTS, FIXED_FINAL_HINTS, HintType, MAX_GUESSES } from '@/types/game'
import { 
  computeBST, 
  getCryUrl, 
  mapGenerationToRegion, 
  isCloseMatch,
  getRandomMove,
  getEvolutionStage,
  formatHeight,
  formatWeight,
  getEnglishFlavorText,
  generateHintSequence
} from '@/utils/pokemon'

export function usePokemonGame() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')  
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [guessesMade, setGuessesMade] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [win, setWin] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [hintSequence, setHintSequence] = useState<HintType[]>([])

  const loadNewPokemon = async () => {
    setLoading(true)
    setError(null)
    setGuessesMade(0)
    setCurrentGuess('')
    setWin(false)
    
    try {
      // Generate new random hint sequence
      const newHintSequence = generateHintSequence()
      setHintSequence(newHintSequence)
      
      // Randomly select a Pokemon ID between 1 and 1025
      const randomId = Math.floor(Math.random() * 1025) + 1
      const pokemon = await getPokemon(randomId)
      setTargetName(pokemon.name.toLowerCase())

      const species = await getSpecies(pokemon.id)
      const evolutionChain = await getEvolutionChain(species.evolution_chain.url)

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
        pokedexEntry: getEnglishFlavorText(species.flavor_text_entries),
        move: getRandomMove(pokemon.moves),
        evolutionStage: getEvolutionStage(pokemon.name, evolutionChain),
        height: pokemon.height,
        weight: pokemon.weight,
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

  // Use the randomized hint sequence instead of fixed sequence
  const revealedHints = debugMode 
    ? hintSequence 
    : win 
    ? hintSequence 
    : hintSequence.slice(0, guessesMade)

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