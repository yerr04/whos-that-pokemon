import { Pokemon } from '@/lib/pokeapi'
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
    threshold: 0.4,
    includeScore: true
  });
  
  const result = fuse.search(guess);
  return result.length > 0 && result[0].score! <= 0.4;
}