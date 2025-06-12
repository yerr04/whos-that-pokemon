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
]

export const FIXED_FINAL_HINTS: HintType[] = ['cry', 'silhouette']

export const MAX_GUESSES = 7