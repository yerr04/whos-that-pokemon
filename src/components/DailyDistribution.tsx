'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSupabase } from '@/components/SupabaseProvider'

interface Props {
  dateKey: string
  maxGuesses: number
  /** The viewer's result for this date: guesses taken if they won, 'loss', or null (not played / guest view) */
  myBucket: number | 'loss' | null
}

interface DistRow {
  bucket: number
  players: number
}

/**
 * "How did everyone else do?" panel shown after finishing a daily.
 *
 * Data comes from the daily_guess_distribution() RPC, which aggregates
 * game_sessions rows for one date into (bucket, players) pairs — bucket is
 * guesses-to-win, 0 means a loss. Only counts leave the database, so this is
 * safe to expose to signed-out visitors too.
 */
export function DailyDistribution({ dateKey, maxGuesses, myBucket }: Props) {
  const { supabase } = useSupabase()
  const [rows, setRows] = useState<DistRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .rpc('daily_guess_distribution', { p_date: dateKey })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load daily distribution:', error)
          setRows([])
        } else {
          setRows((data ?? []) as DistRow[])
        }
      })
    return () => {
      cancelled = true
    }
  }, [supabase, dateKey])

  if (!rows) return null

  const total = rows.reduce((s, r) => s + r.players, 0)
  if (total === 0) return null

  const countFor = (bucket: number) =>
    rows.find((r) => r.bucket === bucket)?.players ?? 0
  const maxCount = Math.max(...rows.map((r) => r.players), 1)

  const mine = myBucket === 'loss' ? 0 : myBucket

  // Players you outperformed: lost, or needed more guesses than you.
  let beatText: string | null = null
  if (typeof mine === 'number' && mine > 0 && total > 1) {
    const worse = rows
      .filter((r) => r.bucket === 0 || r.bucket > mine)
      .reduce((s, r) => s + r.players, 0)
    const pct = Math.round((worse / (total - 1)) * 100)
    if (pct > 0) beatText = `You did better than ${pct}% of trainers today.`
  }

  const buckets: (number | 0)[] = [
    ...Array.from({ length: maxGuesses }, (_, i) => i + 1),
    0,
  ]

  return (
    <div className="mx-auto mb-4 max-w-md rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
          Today&apos;s results
        </h3>
        <span className="text-xs text-white/40">
          {total} trainer{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-1.5">
        {buckets.map((bucket) => {
          const count = countFor(bucket)
          const isMine = mine !== null && bucket === mine
          const width = Math.max((count / maxCount) * 100, count > 0 ? 8 : 4)
          return (
            <div key={bucket} className="flex items-center gap-2 text-sm">
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-white/50">
                {bucket === 0 ? 'X' : bucket}
              </span>
              <div className="relative h-5 flex-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`flex h-full items-center justify-end rounded px-1.5 ${
                    isMine
                      ? 'bg-cyan-500 text-[#0d1a26]'
                      : bucket === 0
                      ? 'bg-red-500/40 text-white/80'
                      : 'bg-white/15 text-white/80'
                  }`}
                >
                  <span className="text-xs font-bold tabular-nums">{count}</span>
                </motion.div>
                {isMine && (
                  <span className="absolute -right-9 top-0 text-[10px] font-bold uppercase leading-5 tracking-wide text-cyan-400">
                    You
                  </span>
                )}
              </div>
              <span className="w-8 shrink-0" aria-hidden />
            </div>
          )
        })}
      </div>

      {beatText && (
        <p className="mt-3 text-center text-sm font-semibold text-cyan-400">
          {beatText}
        </p>
      )}
    </div>
  )
}
