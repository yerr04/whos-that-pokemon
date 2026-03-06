export type HintType =
  | 'bst'
  | 'region'
  | 'ability'
  | 'types'
  | 'pokedex'
  | 'move'
  | 'evolution'
  | 'height'
  | 'weight'
  | 'cry'
  | 'silhouette'
  | 'specialStatus'
  | 'evolutionMethod'
  | 'splitEvolution'
  | 'specialForms'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ParsedPokemonInfo {
  bst: number
  cryUrl: string
  region: string
  ability: string
  types: string[]
  pokedexEntry: string
  silhouetteUrl: string
  move: string
  evolutionStage: string
  height: number
  weight: number
  specialStatus: string
  evolutionMethod: string
  hasSplitEvolution: boolean
  specialForms: string[]
}

export const HINT_TIERS: Record<HintType, 1 | 2 | 3 | 'fixed'> = {
  // Tier 1 (Easy): broad categories most players know
  types: 1,
  region: 1,
  specialStatus: 1,
  evolution: 1,

  // Tier 2 (Medium): requires specific knowledge
  ability: 2,
  move: 2,
  pokedex: 2,
  evolutionMethod: 2,
  splitEvolution: 2,
  specialForms: 2,

  // Tier 3 (Hard): niche/numeric
  bst: 3,
  height: 3,
  weight: 3,

  // Fixed final hints
  cry: 'fixed',
  silhouette: 'fixed',
}

export interface DifficultyConfig {
  maxGuesses: number
  hintCount: number
  allowedTiers: (1 | 2 | 3)[]
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { maxGuesses: 7, hintCount: 4, allowedTiers: [1, 2] },
  medium: { maxGuesses: 6, hintCount: 3, allowedTiers: [1, 2, 3] },
  hard:   { maxGuesses: 5, hintCount: 2, allowedTiers: [2, 3] },
}

export const TIER_1_HINTS: HintType[] = ['types', 'region', 'specialStatus', 'evolution']
export const TIER_2_HINTS: HintType[] = ['ability', 'move', 'pokedex', 'evolutionMethod', 'splitEvolution', 'specialForms']
export const TIER_3_HINTS: HintType[] = ['bst', 'height', 'weight']

export const FIXED_FINAL_HINTS: HintType[] = ['cry', 'silhouette']

export const MAX_GUESSES = 7
