// src/lib/pokeapi.ts

/** ----- Type Definitions ----- */

export interface AbilityEntry {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface TypeEntry {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface StatEntry {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

/** Main Pokémon data */
export interface Pokemon {
  id: number;
  name: string;
  abilities: AbilityEntry[];
  types: TypeEntry[];
  stats: StatEntry[];
  sprites: {
    front_default: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
      };
    };
  };
}

/** Species data (for evolution chain URL, generation, region mapping, etc.) */
export interface Species {
  id: number;
  name: string;
  generation: {
    name: string; // e.g. "generation-i"
    url: string;
  };
  evolution_chain: {
    url: string;
  };
}

/** Evolution chain structure (nested) */
export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  species: {
    name: string;
    url: string;
  };
  evolves_to: EvolutionNode[];
  evolution_details: any[];
}


/** ----- Helper: Typed Fetch with Error Handling ----- */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokeAPI error (${res.status}): ${res.statusText}`);
  }
  return (await res.json()) as T;
}


/** ----- Client Functions ----- */

/**
 * Fetch main Pokémon data (stats, types, abilities, sprites) by name or ID.
 * @param nameOrId e.g. "pikachu" or 25
 */
export function getPokemon(nameOrId: string | number): Promise<Pokemon> {
  const endpoint = `https://pokeapi.co/api/v2/pokemon/${nameOrId}`;
  return fetchJSON<Pokemon>(endpoint);
}

/**
 * Fetch species metadata (generation, evolution_chain URL) by numeric ID.
 * @param id Pokémon numeric ID (1…)
 */
export function getSpecies(id: number): Promise<Species> {
  const endpoint = `https://pokeapi.co/api/v2/pokemon-species/${id}`;
  return fetchJSON<Species>(endpoint);
}

/**
 * Fetch the full evolution chain object from a species' evolution_chain.url.
 * @param url Full URL from the species.evolution_chain.url field
 */
export function getEvolutionChain(url: string): Promise<EvolutionChain> {
  return fetchJSON<EvolutionChain>(url);
}
