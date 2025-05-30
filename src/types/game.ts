export type HintType =
  | 'bst'
  | 'region'
  | 'ability'
  | 'types'
  | 'cry'
  | 'silhouette'

export interface ParsedPokemonInfo {
  bst: number
  cryUrl: string
  region: string
  ability: string
  types: string[]
  silhouetteUrl: string
  pokedexEntry: string
}

export const HINT_SEQUENCE: HintType[] = [
  'bst',
  'region',
  'ability',
  'types',
  'cry',
  'silhouette',
]

export const MAX_GUESSES = HINT_SEQUENCE.length + 1