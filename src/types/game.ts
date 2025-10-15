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
  | "weakness"

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
  weakness: {
    quadWeak: string[],
    weak: string[],
    resist: string[],
    quadResist: string[],
    immune: string[],
  }
}

export const RANDOMIZABLE_HINTS: HintType[] = [
  'bst',
  'region',
  'ability',
  'types',
  'pokedex',
  'move',
  'evolution',
  'height',
  'weight',
  "weakness",
]

export const FIXED_FINAL_HINTS: HintType[] = ['cry', 'silhouette']

export const HINT_SEQUENCE: HintType[] = [
  ...RANDOMIZABLE_HINTS,
  ...FIXED_FINAL_HINTS
]

export const MAX_GUESSES = 7