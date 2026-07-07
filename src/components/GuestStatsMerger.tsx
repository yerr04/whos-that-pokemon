'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSupabase } from '@/components/SupabaseProvider'
import { getGuestStats, hasGuestStats, clearGuestStats } from '@/utils/guestStats'

/**
 * Invisible bridge between guest play and a new account. Mounted once in the
 * root layout. When a signed-in user is present and guest stats exist in
 * localStorage, it offers them to the merge_guest_stats RPC — the server
 * accepts them only for brand-new accounts (no totals rows yet), exactly
 * once, with all values clamped. Local stats are cleared afterwards either
 * way: for an existing account they're redundant.
 */
export function GuestStatsMerger() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!user || attemptedRef.current) return
    if (!hasGuestStats()) return
    attemptedRef.current = true

    const stats = getGuestStats()
    supabase
      .rpc('merge_guest_stats', {
        p_daily_games: stats.dailyGames,
        p_daily_wins: stats.dailyWins,
        p_streak: stats.streak,
        p_max_streak: stats.maxStreak,
        p_last_win_date: stats.lastWinDateKey,
        p_unlimited_games: stats.unlimitedGames,
        p_unlimited_wins: stats.unlimitedWins,
      })
      .then(({ data, error }) => {
        if (error) {
          // Leave local stats in place so a later session can retry.
          console.error('Failed to merge guest stats:', error)
          attemptedRef.current = false
          return
        }
        if (data === true) {
          console.log('Guest stats merged into account')
        }
        clearGuestStats()
      })
  }, [user, supabase])

  return null
}
