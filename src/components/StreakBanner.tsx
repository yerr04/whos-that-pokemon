'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useSupabase } from '@/components/SupabaseProvider'
import { getTodaysDateKey, getTimeUntilNextChallenge } from '@/utils/dailyChallenge'
import { getLiveGuestStreak } from '@/utils/guestStats'

interface StreakInfo {
  streak: number
  freezes: number
  playedToday: boolean
}

/**
 * "Your streak is at risk" nudge for the home page.
 *
 * Signed-in players: reads current_streak / streak_freezes / last_daily_date
 * from their own user_mode_totals row — last_daily_date is only written for
 * plays that counted, so comparing it against today's key answers
 * "played today?" exactly. Guests: derives the same from localStorage.
 * Escalates to an urgent style in the last 3 hours before rollover, and
 * relaxes when a streak freeze would cover the miss.
 */
export function StreakBanner() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [info, setInfo] = useState<StreakInfo | null>(null)
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextChallenge())

  useEffect(() => {
    let cancelled = false
    const todayKey = getTodaysDateKey()

    const load = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_mode_totals')
          .select('current_streak, streak_freezes, last_daily_date')
          .eq('user_id', user.id)
          .eq('mode', 'daily')
          .maybeSingle()
        if (cancelled || error || !data) return
        setInfo({
          streak: data.current_streak ?? 0,
          freezes: data.streak_freezes ?? 0,
          playedToday: data.last_daily_date === todayKey,
        })
      } else {
        const streak = getLiveGuestStreak(todayKey)
        let playedToday = false
        try {
          const raw = localStorage.getItem('daily-pokemon-game')
          if (raw) {
            const parsed = JSON.parse(raw) as { dateKey?: string; completed?: boolean }
            playedToday = parsed.dateKey === todayKey && !!parsed.completed
          }
        } catch {
          // Ignore malformed local saves.
        }
        if (!cancelled) setInfo({ streak, freezes: 0, playedToday })
      }
    }
    load()

    const timer = setInterval(() => setTimeLeft(getTimeUntilNextChallenge()), 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user, supabase])

  if (!info || info.playedToday || info.streak <= 0) return null

  const urgent = timeLeft.hours < 3
  const protectedByFreeze = info.freezes > 0

  const message = urgent
    ? protectedByFreeze
      ? `Your ${info.streak}-day streak would survive on a freeze 🧊 — but why spend it?`
      : `Your ${info.streak}-day streak ends in ${timeLeft.hours}h ${timeLeft.minutes}m!`
    : `Keep your ${info.streak}-day streak alive — today's challenge is waiting.`

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-auto mb-6 flex max-w-xl flex-col items-center justify-between gap-3 rounded-2xl border px-5 py-3 backdrop-blur-sm sm:flex-row ${
        urgent && !protectedByFreeze
          ? 'border-red-400/50 bg-red-500/15'
          : 'border-amber-400/40 bg-amber-400/10'
      }`}
    >
      <p className="text-sm font-semibold text-white">
        {urgent && !protectedByFreeze ? '⚠️ ' : '🔥 '}
        {message}
      </p>
      <Link
        href="/daily"
        className="shrink-0 rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-[#0d1a26] transition-colors hover:bg-cyan-400"
      >
        Play now
      </Link>
    </motion.div>
  )
}
