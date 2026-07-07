// src/utils/share.ts
import { Difficulty } from '@/types/game'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

export interface ShareData {
  mode: 'daily' | 'unlimited'
  win: boolean
  guessesMade: number
  maxGuesses: number
  difficulty: Difficulty
  /** YYYY-MM-DD for the daily challenge; omitted for unlimited */
  dateKey?: string
  /** Current win streak, included when available */
  streak?: number
  /** Base site URL, e.g. window.location.origin */
  url?: string
}

/**
 * Builds the row of result squares without revealing the answer.
 *   🟥 = incorrect guess, 🟩 = winning guess, ⬛ = unused slot
 */
function buildGrid({ win, guessesMade, maxGuesses }: ShareData): string {
  const squares: string[] = []
  for (let i = 0; i < maxGuesses; i++) {
    if (win && i === guessesMade - 1) {
      squares.push('🟩')
    } else if (i < guessesMade) {
      squares.push('🟥')
    } else {
      squares.push('⬛')
    }
  }
  return squares.join('')
}

/**
 * Produces a spoiler-free, Wordle-style shareable result string.
 */
export function buildShareText(data: ShareData): string {
  const { mode, win, guessesMade, maxGuesses, difficulty, dateKey, streak, url } = data

  const heading =
    mode === 'daily' && dateKey
      ? `PokéNerdle Daily ${dateKey}`
      : 'PokéNerdle Unlimited'

  const score = win ? `${guessesMade}/${maxGuesses}` : `X/${maxGuesses}`
  const difficultyTag = `${DIFFICULTY_EMOJI[difficulty]} ${DIFFICULTY_LABEL[difficulty]}`

  const lines = [
    `${heading} — ${difficultyTag}`,
    `${buildGrid(data)} ${score}`,
  ]

  if (typeof streak === 'number' && streak > 0) {
    lines.push(`🔥 ${streak} day streak`)
  }

  if (url) {
    lines.push(url)
  }

  return lines.join('\n')
}
