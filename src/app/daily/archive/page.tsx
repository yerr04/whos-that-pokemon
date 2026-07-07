'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSupabase } from '@/components/SupabaseProvider'
import { useAuth } from '@/hooks/useAuth'
import { listArchiveDateKeys } from '@/utils/dailyChallenge'

type PlayStatus = 'won' | 'lost' | 'unplayed'

/**
 * Replay past daily challenges. Every archive date is a fully deterministic
 * puzzle (derived from the date string), so this page is just a launcher:
 * each chip links to /daily?date=YYYY-MM-DD.
 *
 * Play status comes from the player's own game_sessions rows (signed in) or
 * the per-date localStorage saves (guests / not-yet-synced games).
 */
export default function DailyArchivePage() {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [statuses, setStatuses] = useState<Record<string, PlayStatus>>({})
  const [loading, setLoading] = useState(true)

  const dateKeys = useMemo(() => listArchiveDateKeys(), [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const map: Record<string, PlayStatus> = {}

      // Local saves cover guests and games not yet recorded server-side.
      try {
        for (const key of dateKeys) {
          const raw = localStorage.getItem(`daily-pokemon-game-archive-${key}`)
          if (!raw) continue
          const parsed = JSON.parse(raw) as { completed?: boolean; win?: boolean }
          if (parsed.completed) map[key] = parsed.win ? 'won' : 'lost'
        }
      } catch {
        // Ignore malformed local saves.
      }

      // The server is authoritative for signed-in players.
      if (user) {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('daily_date, win')
          .eq('mode', 'daily')
          .not('daily_date', 'is', null)
        if (!error) {
          for (const row of data ?? []) {
            map[row.daily_date as string] = row.win ? 'won' : 'lost'
          }
        }
      }

      if (!cancelled) {
        setStatuses(map)
        setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [user, supabase, dateKeys])

  // Group by month for scannability.
  const months = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const key of dateKeys) {
      const month = key.slice(0, 7)
      if (!grouped.has(month)) grouped.set(month, [])
      grouped.get(month)!.push(key)
    }
    return [...grouped.entries()]
  }, [dateKeys])

  const playedCount = Object.keys(statuses).length
  const wonCount = Object.values(statuses).filter((s) => s === 'won').length

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 md:pt-28">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-cyan-500">Daily Archive</h1>
        <p className="mt-2 text-sm text-white/50">
          Missed a day? Replay any past daily challenge. Archive games count
          toward your stats, but only today&apos;s challenge feeds your streak.
        </p>
        {!loading && dateKeys.length > 0 && (
          <p className="mt-2 text-xs text-white/40">
            {playedCount}/{dateKeys.length} played · {wonCount} won
          </p>
        )}
      </div>

      {dateKeys.length === 0 ? (
        <p className="py-8 text-center text-white/50">
          No past challenges yet — come back tomorrow!
        </p>
      ) : (
        <div className="space-y-6">
          {months.map(([month, keys]) => {
            const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(
              'en-US',
              { month: 'long', year: 'numeric', timeZone: 'UTC' },
            )
            return (
              <div
                key={month}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
                  {monthLabel}
                </h2>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-8">
                  {keys.map((key) => {
                    const status = statuses[key] ?? 'unplayed'
                    const day = Number(key.slice(8, 10))
                    return (
                      <motion.div key={key} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href={`/daily?date=${key}`}
                          title={
                            status === 'unplayed'
                              ? `Play ${key}`
                              : `${key} — ${status === 'won' ? 'solved' : 'missed'} (view)`
                          }
                          className={`flex h-11 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                            status === 'won'
                              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                              : status === 'lost'
                              ? 'border-red-400/40 bg-red-500/15 text-red-300'
                              : 'border-white/10 bg-white/5 text-white/70 hover:border-cyan-400/50 hover:text-white'
                          }`}
                        >
                          <span className="tabular-nums">{day}</span>
                          <span className="text-[9px] leading-none opacity-80">
                            {status === 'won' ? '✓' : status === 'lost' ? '✗' : ''}
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
