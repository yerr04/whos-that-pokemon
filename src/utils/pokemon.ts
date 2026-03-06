import { Pokemon, MoveEntry, EvolutionChainNode } from '@/lib/pokeapi'
import {
  HintType,
  Difficulty,
  DIFFICULTY_CONFIG,
  TIER_1_HINTS,
  TIER_2_HINTS,
  TIER_3_HINTS,
} from '@/types/game'
import { isFormPokemon, formatFormDisplayName } from '@/data/pokemonCategories'
import Fuse from 'fuse.js'

export function computeBST(p: Pokemon): number {
  return p.stats.reduce((sum, s) => sum + s.base_stat, 0)
}

export function getCryUrl(name: string): string {
  return `https://play.pokemonshowdown.com/audio/cries/${name}.mp3`
}

export function mapGenerationToRegion(gen: string): string {
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

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format a Pokemon name for display. Handles form names using suffix format.
 */
export function getDisplayName(apiName: string, pokemonId: number): string {
  if (isFormPokemon(pokemonId)) {
    return formatFormDisplayName(apiName, pokemonId)
  }
  return capitalize(apiName)
}

/**
 * Collapse hyphens, spaces, and parentheses into a single canonical form
 * so "venusaur mega", "venusaur-mega", and "Venusaur (Mega)" all compare equal.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[-\s()]/g, '')
}

export function isCloseMatch(guess: string, target: string): boolean {
  if (normalize(guess) === normalize(target)) return true

  const fuse = new Fuse([target], {
    threshold: 0.25,
    includeScore: true
  });
  
  const result = fuse.search(guess);
  if (result.length > 0 && result[0].score! <= 0.25) return true

  return false
}

// Seeded RNG (32-bit LCG) from a string seed
export function createSeededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + c
    hash |= 0 // 32-bit
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) % 2**32
    const n = hash < 0 ? hash + 2**32 : hash
    return n / 2**32
  }
}

export function getRandomMove(moves: MoveEntry[], customRandom?: () => number): string {
  if (!moves?.length) return '—'
  const rnd = customRandom || Math.random
  const idx = Math.floor(rnd() * moves.length)
  return moves[idx]?.move?.name || '—'
}

/**
 * Walk the evolution chain to determine the stage of the given Pokemon.
 * Handles form Pokemon by matching against the base species name.
 */
export function getEvolutionStage(
  pokemonName: string,
  evolutionChain: { chain: EvolutionChainNode } | undefined,
  speciesName?: string
): string {
  if (!evolutionChain) return 'Unknown'
  const chain = evolutionChain.chain
  const nameToMatch = speciesName || pokemonName

  if (chain.species.name === nameToMatch) {
    return chain.evolves_to.length > 0 ? 'First Stage' : 'No Evolution'
  }

  for (const secondStage of chain.evolves_to) {
    if (secondStage.species.name === nameToMatch) {
      return secondStage.evolves_to.length > 0 ? 'Middle Stage' : 'Final Stage'
    }
    for (const thirdStage of secondStage.evolves_to) {
      if (thirdStage.species.name === nameToMatch) {
        return 'Final Stage'
      }
    }
  }

  return 'Unknown'
}

/**
 * Walk the chain to find the evolution trigger for how this Pokemon was reached.
 */
export function getEvolutionMethod(
  pokemonName: string,
  evolutionChain: { chain: EvolutionChainNode } | undefined,
  speciesName?: string
): string {
  if (!evolutionChain) return 'N/A'
  const nameToMatch = speciesName || pokemonName

  function findInChain(node: EvolutionChainNode): string | null {
    for (const child of node.evolves_to) {
      if (child.species.name === nameToMatch) {
        const detail = child.evolution_details[0]
        if (!detail) return 'Level-Up'
        const trigger = detail.trigger?.name
        if (trigger === 'trade') return detail.item ? `Trade (${capitalize(detail.item.name.replace(/-/g, ' '))})` : 'Trade'
        if (trigger === 'use-item' && detail.item) return `Item (${capitalize(detail.item.name.replace(/-/g, ' '))})`
        if (detail.min_happiness) return 'Friendship'
        if (trigger === 'level-up') return 'Level-Up'
        return capitalize(trigger?.replace(/-/g, ' ') || 'Other')
      }
      const deeper = findInChain(child)
      if (deeper) return deeper
    }
    return null
  }

  // First stage has no incoming evolution
  if (evolutionChain.chain.species.name === nameToMatch) return 'N/A'
  return findInChain(evolutionChain.chain) || 'N/A'
}

/**
 * Check if any node in the chain has branching evolutions.
 */
export function hasSplitEvolution(
  evolutionChain: { chain: EvolutionChainNode } | undefined
): boolean {
  if (!evolutionChain) return false

  function check(node: EvolutionChainNode): boolean {
    if (node.evolves_to.length > 1) return true
    return node.evolves_to.some(check)
  }

  return check(evolutionChain.chain)
}

export function formatHeight(decimeters: number): string {
  const meters = decimeters / 10;
  const feet = Math.floor(meters * 3.28084);
  const inches = Math.round((meters * 3.28084 - feet) * 12);
  return `${meters}m (${feet}'${inches}")`;
}

export function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  const lbs = Math.round(kg * 2.20462);
  return `${kg}kg (${lbs} lbs)`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function redactPokemonName(text: string, name: string) {
  const tokens = name.split(/[\s\-\.'']+/).filter(Boolean).map(escapeRegExp)
  if (!tokens.length) return text
  const sep = `[\\s\\-.'']*`
  const pattern = `\\b${tokens.join(sep)}\\b('s)?`
  const re = new RegExp(pattern, 'gi')
  return text.replace(re, (_m, s) => `This pokemon${s ?? ''}`)
}

export function getEnglishFlavorText(flavorTextEntries: any[], pokemonName?: string): string {
  const englishEntry = flavorTextEntries.find(entry => entry.language.name === 'en')
  const raw = englishEntry?.flavor_text ?? ''
  let text = raw.replace(/\f/g, ' ')
  if (pokemonName) text = redactPokemonName(text, pokemonName)
  return text || '—'
}

/**
 * Generate a hint sequence based on difficulty.
 * Draws from the allowed tier pools, shuffles, picks the required count,
 * then appends cry and silhouette as the final 2 hints.
 */
export function generateHintSequence(
  difficulty: Difficulty = 'medium',
  customRandom?: () => number
): HintType[] {
  const randomFunc = customRandom || Math.random
  const config = DIFFICULTY_CONFIG[difficulty]

  // Build the pool of hints from allowed tiers
  const pool: HintType[] = []
  if (config.allowedTiers.includes(1)) pool.push(...TIER_1_HINTS)
  if (config.allowedTiers.includes(2)) pool.push(...TIER_2_HINTS)
  if (config.allowedTiers.includes(3)) pool.push(...TIER_3_HINTS)

  // Fisher-Yates shuffle
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return [
    ...shuffled.slice(0, config.hintCount),
    'cry',
    'silhouette',
  ]
}

export type { HintType }
