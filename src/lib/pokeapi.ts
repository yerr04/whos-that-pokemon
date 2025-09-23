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
  // For stale-while-revalidate
  refreshing?: boolean;
}

const MAX_ENTRIES = 150;
const CACHE_DURATION = 30 * 60 * 1000;      // Fresh window: 30 min
const STALE_DURATION = 60 * 60 * 1000;      // Serve stale up to 1 hr total

const cache = new Map<string, CacheEntry<any>>();
const inFlight = new Map<string, Promise<any>>();

function touchKey(key: string) {
  // LRU: reinsert key to mark as most recently used
  if (!cache.has(key)) return;
  const entry = cache.get(key)!;
  cache.delete(key);
  cache.set(key, entry);
}

function enforceSizeLimit() {
  while (cache.size > MAX_ENTRIES) {
    // Evict oldest (first inserted) – basic LRU
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

function getCachedData<T>(key: string): { data: T; fresh: boolean } | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age < CACHE_DURATION) {
    touchKey(key);
    return { data: entry.data, fresh: true };
  }
  if (age < STALE_DURATION) {
    // Stale but still usable; trigger background refresh if not already
    if (!entry.refreshing) {
      entry.refreshing = true;
      // Fire-and-forget revalidation
      fetchAndCache<T>(key).finally(() => {
        const e = cache.get(key);
        if (e) e.refreshing = false;
      });
    }
    return { data: entry.data, fresh: false };
  }
  // Fully expired
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  enforceSizeLimit();
}

// Core network fetch with dedupe
async function fetchAndCache<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (inFlight.has(url)) {
    return inFlight.get(url) as Promise<T>;
  }
  const p = (async () => {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      // Optional: classify errors
      throw new Error(`PokeAPI error (${res.status}): ${res.statusText}`);
    }
    const json = (await res.json()) as T;
    setCachedData(url, json);
    return json;
  })();
  inFlight.set(url, p);
  try {
    return await p;
  } finally {
    inFlight.delete(url);
  }
}

async function fetchJSON<T>(url: string, opts?: { signal?: AbortSignal; force?: boolean }): Promise<T> {
  if (!opts?.force) {
    const cached = getCachedData<T>(url);
    if (cached) return cached.data;
  }
  return fetchAndCache<T>(url, opts?.signal);
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

/**
 * Prefetch Pokémon data bundle: main data, species info, and evolution chain (if available).
 * @param id Pokémon numeric ID
 */
export function prefetchPokemonBundle(id: number) {
  void Promise.all([
    getPokemon(id),
    getSpecies(id).then(s =>
      s.evolution_chain?.url ? getEvolutionChain(s.evolution_chain.url) : null
    )
  ]).catch(() => {});
}

/**
 * Optional: clear only stale fully expired entries (maintenance)
 */
export function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > STALE_DURATION) {
      cache.delete(key);
    }
  }
}
