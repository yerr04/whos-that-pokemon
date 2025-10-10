import { Pokemon, MoveEntry } from '@/lib/pokeapi'
import { HintType, RANDOMIZABLE_HINTS, FIXED_FINAL_HINTS } from '@/types/game'
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

export function isCloseMatch(guess: string, target: string): boolean {
  const fuse = new Fuse([target], {
    threshold: 0.25,
    includeScore: true
  });
  
  const result = fuse.search(guess);
  return result.length > 0 && result[0].score! <= 0.25;
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

// Get a random learnable move from the Pokemon's moveset
export function getRandomMove(moves: MoveEntry[], customRandom?: () => number): string {
  if (!moves?.length) return '—'
  const rnd = customRandom || Math.random
  const idx = Math.floor(rnd() * moves.length)
  return moves[idx]?.move?.name || '—'
}

// Determine evolution stage from evolution chain
export function getEvolutionStage(pokemonName: string, evolutionChain: any): string {
  const chain = evolutionChain.chain;
  
  // First stage
  if (chain.species.name === pokemonName) {
    return chain.evolves_to.length > 0 ? 'First Stage' : 'No Evolution';
  }
  
  // Second stage
  for (const secondStage of chain.evolves_to) {
    if (secondStage.species.name === pokemonName) {
      return secondStage.evolves_to.length > 0 ? 'Second Stage' : 'Final Stage';
    }
    
    // Third stage
    for (const thirdStage of secondStage.evolves_to) {
      if (thirdStage.species.name === pokemonName) {
        return 'Final Stage';
      }
    }
  }
  
  return 'Unknown';
}

// Convert height from decimeters to readable format
export function formatHeight(decimeters: number): string {
  const meters = decimeters / 10;
  const feet = Math.floor(meters * 3.28084);
  const inches = Math.round((meters * 3.28084 - feet) * 12);
  return `${meters}m (${feet}'${inches}")`;
}

// Convert weight from hectograms to readable format
export function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  const lbs = Math.round(kg * 2.20462);
  return `${kg}kg (${lbs} lbs)`;
}

// Get English flavor text from species data
export function getEnglishFlavorText(flavorTextEntries: any[]): string {
  const englishEntry = flavorTextEntries.find(entry => 
    entry.language.name === 'en'
  );
  return englishEntry?.flavor_text.replace(/\f/g, ' ') || '—';
}

// Generate randomized hint sequence
export function generateHintSequence(customRandom?: () => number): HintType[] {
  const randomFunc = customRandom || Math.random
  
  // Shuffle the randomizable hints using the provided random function
  const shuffled = [...RANDOMIZABLE_HINTS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Take first 4 randomized hints + cry + silhouette as the final 2
  return [
    ...shuffled.slice(0, 4),
    'cry',        // 6th hint - always cry
    'silhouette'  // 7th hint - always silhouette
  ]
}
export type { HintType }