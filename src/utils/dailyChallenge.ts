// src/utils/dailyChallenge.ts

// DST-safe "now in ET" without relying on ISO date (which is UTC)
const TZ = 'America/New_York'
const ROLLOVER_HOUR_ET = 10 // 10 AM ET

function zonedNow(now: Date = new Date()) {
  // Convert to a Date that represents the same wall-clock time in TZ
  const inv = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  const diff = now.getTime() - inv.getTime()
  return new Date(now.getTime() - diff) // this behaves like "now in TZ"
}

function ymd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns YYYY-MM-DD for the current challenge date (flips at 10:00 AM ET)
export function getTodaysDateKey(now: Date = new Date()): string {
  const et = zonedNow(now)
  const boundary = new Date(et)
  boundary.setHours(ROLLOVER_HOUR_ET, 0, 0, 0)
  const base = et < boundary ? new Date(et.getTime() - 24 * 60 * 60 * 1000) : et
  return ymd(base)
}

// Time until next rollover (10:00 AM ET)
export function getTimeUntilNextChallenge(now: Date = new Date()): { hours: number; minutes: number; seconds: number } {
  const et = zonedNow(now)
  const next = new Date(et)
  next.setHours(ROLLOVER_HOUR_ET, 0, 0, 0)
  if (et >= next) next.setDate(next.getDate() + 1)
  const diff = next.getTime() - et.getTime()
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

// Deterministic daily Pokémon ID derived ONLY from the dateKey
export function getDailyPokemonId(dateKey?: string): number {
  const key = dateKey ?? getTodaysDateKey()

  // FNV-1a 32-bit hash for stability
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }

  // Map to 1..1025
  return (h % 1025) + 1
}