// src/hooks/useFriendGroups.ts
import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useAuth } from './useAuth'

export interface FriendGroup {
  group_id: string
  name: string
  code: string
  owner_id: string
  member_count: number
  is_owner: boolean
}

export interface GroupLeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  current_streak: number
  max_streak: number
  daily_wins: number
  total_games: number
}

/**
 * Friend groups live in two RLS-locked tables (friend_groups,
 * friend_group_members) that clients can never touch directly — every
 * operation here is a SECURITY DEFINER RPC keyed on auth.uid(). Groups are
 * joined by a 6-character invite code shown to members.
 */
export function useFriendGroups() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    // Always await before touching state so callers (including the mount
    // effect) never trigger a synchronous re-render.
    const { data, error } = await (user
      ? supabase.rpc('my_friend_groups')
      : Promise.resolve({ data: [] as FriendGroup[], error: null }))
    if (error) {
      console.error('Failed to load friend groups:', error)
    } else {
      setGroups((data ?? []) as FriendGroup[])
    }
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    // Defer to a microtask so the mount render commits before state lands.
    void Promise.resolve().then(refresh)
  }, [refresh])

  const createGroup = useCallback(
    async (name: string): Promise<FriendGroup> => {
      const { data, error } = await supabase.rpc('create_friend_group', {
        p_name: name,
      })
      if (error) throw new Error(error.message)
      await refresh()
      return (data as FriendGroup[])[0]
    },
    [supabase, refresh],
  )

  const joinGroup = useCallback(
    async (code: string): Promise<FriendGroup> => {
      const { data, error } = await supabase.rpc('join_friend_group', {
        p_code: code,
      })
      if (error) throw new Error(error.message)
      await refresh()
      return (data as FriendGroup[])[0]
    },
    [supabase, refresh],
  )

  const leaveGroup = useCallback(
    async (groupId: string) => {
      const { error } = await supabase.rpc('leave_friend_group', {
        p_group_id: groupId,
      })
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh],
  )

  return { groups, loading, refresh, createGroup, joinGroup, leaveGroup }
}

/** Members of one group ranked by current daily streak (server-computed). */
export function useGroupLeaderboard(groupId: string | null) {
  const { supabase } = useSupabase()
  const [entries, setEntries] = useState<GroupLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!groupId) {
        if (!cancelled) setEntries([])
        return
      }
      setLoading(true)
      const { data, error } = await supabase.rpc('friend_group_leaderboard', {
        p_group_id: groupId,
      })
      if (cancelled) return
      if (error) {
        console.error('Failed to load group leaderboard:', error)
        setEntries([])
      } else {
        setEntries((data ?? []) as GroupLeaderboardEntry[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase, groupId])

  return { entries, loading }
}
