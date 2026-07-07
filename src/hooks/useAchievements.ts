// src/hooks/useAchievements.ts
import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useAuth } from './useAuth'

/**
 * Unlocked achievements for the signed-in user.
 *
 * Data flow: unlock conditions are evaluated server-side by the
 * check_achievements() RPC (from user_mode_totals + game_sessions), which
 * inserts any newly earned rows into user_achievements and returns just the
 * new ids. Game hooks call checkAchievements() after recording a result and
 * surface the returned ids as an "Achievement unlocked!" banner.
 */
export function useAchievements() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchUnlocked = async () => {
      if (!user) {
        if (!cancelled) {
          setUnlocked(new Set())
          setLoading(false)
        }
        return
      }
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
      if (cancelled) return
      if (error) {
        console.error('Failed to load achievements:', error)
      } else {
        setUnlocked(new Set((data ?? []).map((r) => r.achievement_id as string)))
      }
      setLoading(false)
    }
    fetchUnlocked()

    return () => {
      cancelled = true
    }
  }, [user, supabase])

  /** Runs the server-side check; returns ids unlocked by this call. */
  const checkAchievements = useCallback(async (): Promise<string[]> => {
    if (!user) return []
    const { data, error } = await supabase.rpc('check_achievements')
    if (error) {
      console.error('Failed to check achievements:', error)
      return []
    }
    const newIds = ((data ?? []) as { check_achievements: string }[] | string[])
      .map((row) => (typeof row === 'string' ? row : row.check_achievements))
      .filter(Boolean)
    if (newIds.length > 0) {
      setUnlocked((prev) => new Set([...prev, ...newIds]))
    }
    return newIds
  }, [user, supabase])

  return { unlocked, loading, checkAchievements }
}
