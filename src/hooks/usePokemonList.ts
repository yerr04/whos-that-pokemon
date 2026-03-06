import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { ALL_FORM_IDS, formatFormDisplayName } from '@/data/pokemonCategories'

export interface PokemonListEntry {
  name: string
  displayName: string
  id: number
}

export interface PokemonSuggestion extends PokemonListEntry {
  spriteUrl: string
}

const STORAGE_KEY = 'pokemon-name-list-v2'
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

// Fetch enough entries to include all form IDs (base Pokemon + forms)
const API_URL = 'https://pokeapi.co/api/v2/pokemon?limit=1500'

let memoryCache: PokemonListEntry[] | null = null

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

function extractId(url: string): number {
  const parts = url.replace(/\/$/, '').split('/')
  return parseInt(parts[parts.length - 1], 10)
}

/**
 * Build a display name for a Pokemon. For base Pokemon (IDs 1-1025),
 * capitalize the name. For form Pokemon, use the suffix format.
 */
function buildDisplayName(name: string, id: number): string {
  if (id > 10000) {
    return formatFormDisplayName(name, id)
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function loadFromStorage(): PokemonListEntry[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data as PokemonListEntry[]
  } catch {
    return null
  }
}

function saveToStorage(data: PokemonListEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Storage full or unavailable
  }
}

const VALID_IDS = new Set([
  ...Array.from({ length: 1025 }, (_, i) => i + 1),
  ...ALL_FORM_IDS,
])

export function usePokemonList() {
  const [list, setList] = useState<PokemonListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const fuseRef = useRef<Fuse<PokemonListEntry> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (memoryCache) {
        setList(memoryCache)
        setLoading(false)
        return
      }

      const stored = loadFromStorage()
      if (stored) {
        memoryCache = stored
        if (!cancelled) {
          setList(stored)
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error(`Failed to fetch Pokemon list: ${res.status}`)
        const json = await res.json()
        const entries: PokemonListEntry[] = json.results
          .map((p: { name: string; url: string }) => {
            const id = extractId(p.url)
            return { name: p.name, displayName: buildDisplayName(p.name, id), id }
          })
          .filter((entry: PokemonListEntry) => VALID_IDS.has(entry.id))

        memoryCache = entries
        saveToStorage(entries)
        if (!cancelled) {
          setList(entries)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load Pokemon list:', err)
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (list.length > 0) {
      fuseRef.current = new Fuse(list, {
        keys: ['name', 'displayName'],
        threshold: 0.35,
        includeScore: true,
      })
    }
  }, [list])

  function search(query: string, limit = 6): PokemonSuggestion[] {
    if (!query.trim() || !fuseRef.current) return []
    return fuseRef.current
      .search(query, { limit })
      .map((result) => ({
        ...result.item,
        spriteUrl: getSpriteUrl(result.item.id),
      }))
  }

  return { list, loading, search }
}
