// src/hooks/useLeaderboard.ts
import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useAuth } from './useAuth'

export type LeaderboardKey = 'least_hints' | 'longest_streak' | 'most_games'

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  score: number
  games_played: number
}

const RPC_BY_KEY: Record<LeaderboardKey, string> = {
  least_hints: 'leaderboard_least_hints',
  longest_streak: 'leaderboard_longest_streak',
  most_games: 'leaderboard_most_games',
}

export function useLeaderboard(key: LeaderboardKey, limit = 10) {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchLeaderboard = async () => {
      setLoading(true)
      setError(null)

      const [topRes, mineRes] = await Promise.all([
        supabase.rpc(RPC_BY_KEY[key], { p_limit: limit }),
        userId
          ? supabase.rpc('leaderboard_my_rank', { p_board: key })
          : Promise.resolve({ data: null, error: null }),
      ])

      if (cancelled) return

      if (topRes.error) {
        console.error(`Failed to load leaderboard "${key}":`, topRes.error)
        setError(topRes.error.message)
        setEntries([])
      } else {
        setEntries((topRes.data ?? []) as LeaderboardEntry[])
      }

      if (mineRes.error) {
        console.error(`Failed to load personal rank for "${key}":`, mineRes.error)
        setMyEntry(null)
      } else {
        const rows = (mineRes.data ?? []) as LeaderboardEntry[]
        setMyEntry(rows.length > 0 ? rows[0] : null)
      }

      setLoading(false)
    }

    fetchLeaderboard()

    return () => {
      cancelled = true
    }
  }, [supabase, key, limit, userId])

  return { entries, myEntry, loading, error }
}
