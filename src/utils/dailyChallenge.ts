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

// ---------------------------------------------------------------------------
// Daily archive
// ---------------------------------------------------------------------------

// Earliest replayable daily. Set this to the app's launch date — puzzles are
// derived from the date string, so any date on/after this yields a valid game.
export const DAILY_ARCHIVE_START = '2025-12-01'

// Valid archive targets are real YYYY-MM-DD keys strictly BEFORE today's
// challenge (today is played on /daily itself). ISO date strings compare
// correctly as plain strings.
export function isValidArchiveDateKey(key: string | null | undefined, now: Date = new Date()): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const parsed = new Date(`${key}T00:00:00Z`)
  if (isNaN(parsed.getTime())) return false
  return key >= DAILY_ARCHIVE_START && key < getTodaysDateKey(now)
}

// All archive date keys, newest first (yesterday back to DAILY_ARCHIVE_START).
export function listArchiveDateKeys(now: Date = new Date()): string[] {
  const keys: string[] = []
  const today = getTodaysDateKey(now)
  const cursor = new Date(`${today}T00:00:00Z`)
  cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (key < DAILY_ARCHIVE_START) break
    keys.push(key)
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return keys
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