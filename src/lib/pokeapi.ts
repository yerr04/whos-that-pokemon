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
  height: number; // in decimeters
  weight: number; // in hectograms
  moves: MoveEntry[];
  sprites: {
    front_default: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
      };
    };
  };
}

export interface MoveEntry {
  move: {
    name: string;
    url: string;
  };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
  }[];
}

export interface Species {
  id: number;
  name: string;
  generation: {
    name: string;
    url: string;
  };
  evolution_chain: {
    url: string;
  };
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
}

export interface EvolutionChain {
  chain: {
    species: {
      name: string;
    };
    evolves_to: {
      species: {
        name: string;
      };
      evolves_to: {
        species: {
          name: string;
        };
      }[];
    }[];
  };
}

/** ----- Cache Implementation ----- */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  // Remove expired entry
  if (cached) {
    cache.delete(key);
  }
  
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/** ----- Helper: Typed Fetch with Error Handling and Caching ----- */
async function fetchJSON<T>(url: string): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(url);
  if (cached) {
    return cached;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokeAPI error (${res.status}): ${res.statusText}`);
  }
  
  const data = (await res.json()) as T;
  
  // Cache the result
  setCachedData(url, data);
  
  return data;
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
 * Fetch evolution chain data
 * @param url Evolution chain URL from species data
 */
export function getEvolutionChain(url: string): Promise<EvolutionChain> {
  return fetchJSON<EvolutionChain>(url);
}

/* Clear all cached data */
export function clearCache(): void {
  cache.clear();
}

/* Get cache statistics */
export function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}
