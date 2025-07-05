// src/hooks/useDailyChallenge.ts
import { useState, useEffect } from 'react'
import { getDailyPokemonId, getTimeUntilNextChallenge, getTodaysDateKey } from '@/utils/dailyChallenge'
import { getPokemon, getSpecies } from '@/lib/pokeapi'
import { ParsedPokemonInfo, HINT_SEQUENCE, MAX_GUESSES } from '@/types/game'
import { computeBST, getCryUrl, mapGenerationToRegion, isCloseMatch } from '@/utils/pokemon'

interface DailyGameState {
  dateKey: string
  pokemonId: number
  guessesMade: number
  guesses: string[]
  win: boolean
  completed: boolean
}

const STORAGE_KEY = 'daily-pokemon-game'

export function useDailyChallenge() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetName, setTargetName] = useState<string>('')
  const [info, setInfo] = useState<ParsedPokemonInfo | null>(null)
  const [gameState, setGameState] = useState<DailyGameState | null>(null)
  const [currentGuess, setCurrentGuess] = useState('')
  const [timeUntilNext, setTimeUntilNext] = useState(getTimeUntilNextChallenge())

  // Load daily Pokemon and game state
  const loadDailyChallenge = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const todayKey = getTodaysDateKey()
      const pokemonId = getDailyPokemonId()
      
      // Load saved game state
      const savedGame = localStorage.getItem(STORAGE_KEY)
      let currentState: DailyGameState
      
      if (savedGame) {
        const parsed = JSON.parse(savedGame) as DailyGameState
        
        // Check if it's a new day
        if (parsed.dateKey === todayKey) {
          currentState = parsed
        } else {
          // New day, reset game
          currentState = {
            dateKey: todayKey,
            pokemonId,
            guessesMade: 0,
            guesses: [],
            win: false,
            completed: false
          }
        }
      } else {
        // First time playing
        currentState = {
          dateKey: todayKey,
          pokemonId,
          guessesMade: 0,
          guesses: [],
          win: false,
          completed: false
        }
      }
      
      setGameState(currentState)
      
      // Load Pokemon data
      const pokemon = await getPokemon(pokemonId)
      setTargetName(pokemon.name.toLowerCase())
      
      const species = await getSpecies(pokemon.id)
      
      // Provide all required fields for ParsedPokemonInfo
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
        pokedexEntry: species.flavor_text_entries.find(entry =>
          entry.language.name === 'en')?.flavor_text || '',
        move: pokemon.moves[0]?.move.name ?? '—',
        evolutionStage: species.evolution_chain?.url ? 
          species.evolution_chain.url.split('/').slice(-2, -1)[0] : '—',
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

  // Save game state
  const saveGameState = (state: DailyGameState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  // Handle guess
  const handleGuess = () => {
    if (!gameState || gameState.completed || gameState.guessesMade >= MAX_GUESSES) return

    const isCorrect = isCloseMatch(currentGuess.toLowerCase(), targetName)
    const newGuessesMade = gameState.guessesMade + 1
    
    const newState: DailyGameState = {
      ...gameState,
      guessesMade: newGuessesMade,
      guesses: [...gameState.guesses, currentGuess],
      win: isCorrect,
      completed: isCorrect || newGuessesMade >= MAX_GUESSES
    }
    
    setGameState(newState)
    saveGameState(newState)
    setCurrentGuess('')
  }

  // Get revealed hints based on guesses made
  const revealedHints = gameState ? 
    HINT_SEQUENCE.slice(0, gameState.guessesMade) : []

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextChallenge())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Load challenge on mount
  useEffect(() => {
    loadDailyChallenge()
  }, [])

  return {
    loading,
    error,
    targetName,
    info,
    guessesMade: gameState?.guessesMade || 0,
    guesses: gameState?.guesses || [],
    currentGuess,
    setCurrentGuess,
    win: gameState?.win || false,
    completed: gameState?.completed || false,
    handleGuess,
    revealedHints,
    timeUntilNext,
    pokemonId: gameState?.pokemonId || 0
  }
}