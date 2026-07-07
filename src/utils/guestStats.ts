// src/utils/guestStats.ts
//
// Local stats for players who aren't signed in. Mirrors the shape of
// user_mode_totals closely enough that the whole object can be handed to the
// merge_guest_stats RPC once, right after the player's first sign-in
// (see GuestStatsMerger). Signed-in play never touches this.

export interface GuestStats {
  dailyGames: number
  dailyWins: number
  unlimitedGames: number
  unlimitedWins: number
  streak: number
  maxStreak: number
  /** dateKey (YYYY-MM-DD) of the last daily win that counted for the streak */
  lastWinDateKey: string | null
}

const STORAGE_KEY = 'guest-stats'

const EMPTY: GuestStats = {
  dailyGames: 0,
  dailyWins: 0,
  unlimitedGames: 0,
  unlimitedWins: 0,
  streak: 0,
  maxStreak: 0,
  lastWinDateKey: null,
}

export function getGuestStats(): GuestStats {
  if (typeof localStorage === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<GuestStats>) }
  } catch {
    return { ...EMPTY }
  }
}

export function hasGuestStats(): boolean {
  const s = getGuestStats()
  return s.dailyGames > 0 || s.unlimitedGames > 0
}

export function clearGuestStats() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/** dateKey for the day before a YYYY-MM-DD key (matches dailyChallenge keys) */
function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - 1)
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${mm}-${dd}`
}

/**
 * Records a finished guest game. Daily streaks follow the same rule as the
 * server: a win extends the streak only if the previous counted win was the
 * day before (no freezes for guests — that's a sign-up perk).
 */
export function recordGuestGame(
  mode: 'daily' | 'unlimited',
  won: boolean,
  todayDateKey?: string,
): GuestStats {
  const stats = getGuestStats()

  if (mode === 'daily') {
    stats.dailyGames += 1
    if (won) stats.dailyWins += 1

    if (todayDateKey) {
      if (won) {
        const consecutive =
          stats.lastWinDateKey !== null &&
          stats.lastWinDateKey === previousDateKey(todayDateKey)
        stats.streak = consecutive ? stats.streak + 1 : 1
        stats.lastWinDateKey = todayDateKey
      } else {
        stats.streak = 0
      }
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak)
    }
  } else {
    stats.unlimitedGames += 1
    if (won) stats.unlimitedWins += 1
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Storage full/unavailable — guest stats are best-effort.
  }
  return stats
}

/**
 * The guest's streak, decayed the same way the server would see it: it only
 * still counts if the last win was today or yesterday.
 */
export function getLiveGuestStreak(todayDateKey: string): number {
  const stats = getGuestStats()
  if (stats.streak <= 0 || !stats.lastWinDateKey) return 0
  if (
    stats.lastWinDateKey === todayDateKey ||
    stats.lastWinDateKey === previousDateKey(todayDateKey)
  ) {
    return stats.streak
  }
  return 0
}
