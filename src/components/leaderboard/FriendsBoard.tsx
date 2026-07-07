'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import {
  useFriendGroups,
  useGroupLeaderboard,
  type FriendGroup,
} from '@/hooks/useFriendGroups'

/**
 * Private leaderboards. A group is just a name + 6-char invite code; members
 * are ranked by current daily streak via the friend_group_leaderboard RPC
 * (only members can call it — the server checks membership).
 */
export function FriendsBoard() {
  const { user, avatarUrl } = useAuth()
  const { groups, loading, createGroup, joinGroup, leaveGroup } = useFriendGroups()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const activeGroup: FriendGroup | null =
    groups.find((g) => g.group_id === selectedId) ?? groups[0] ?? null
  const { entries, loading: entriesLoading } = useGroupLeaderboard(
    activeGroup?.group_id ?? null,
  )

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
        <p className="text-white/70">
          Sign in to create a private leaderboard and race your friends&apos; streaks.
        </p>
        <Link
          href="/auth/sign-in?redirectTo=/leaderboard"
          className="mt-4 inline-block rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-[#0d1a26] transition-colors hover:bg-cyan-400"
        >
          Sign in with Google
        </Link>
      </div>
    )
  }

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
      setMessage({ ok: true, text: okText })
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Something went wrong.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = () => {
    const name = createName.trim()
    if (!name) return
    run(async () => {
      const g = await createGroup(name)
      setSelectedId(g.group_id)
      setCreateName('')
    }, 'Group created! Share the invite code with friends.')
  }

  const handleJoin = () => {
    const code = joinCode.trim()
    if (!code) return
    run(async () => {
      const g = await joinGroup(code)
      setSelectedId(g.group_id)
      setJoinCode('')
    }, 'Joined the group!')
  }

  const handleLeave = () => {
    if (!activeGroup) return
    if (!window.confirm(`Leave "${activeGroup.name}"?`)) return
    run(async () => {
      await leaveGroup(activeGroup.group_id)
      setSelectedId(null)
    }, 'Left the group.')
  }

  const copyCode = async () => {
    if (!activeGroup) return
    try {
      await navigator.clipboard.writeText(activeGroup.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — code is visible to copy manually.
    }
  }

  return (
    <div className="space-y-4">
      {/* Create / join */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
            Create a group
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Group name"
              maxLength={30}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            <button
              onClick={handleCreate}
              disabled={busy || !createName.trim()}
              className="shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#0d1a26] transition-colors hover:bg-cyan-400 disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
            Join with a code
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="ABC123"
              maxLength={6}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            <button
              onClick={handleJoin}
              disabled={busy || joinCode.trim().length < 6}
              className="shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#0d1a26] transition-colors hover:bg-cyan-400 disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Group tabs */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {groups.map((g) => (
            <motion.button
              key={g.group_id}
              onClick={() => setSelectedId(g.group_id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                activeGroup?.group_id === g.group_id
                  ? 'bg-cyan-500 text-[#0d1a26]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {g.name}
              <span className="ml-1.5 text-xs opacity-60">{g.member_count}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Active group */}
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ) : !activeGroup ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <p className="text-white/50">
            You&apos;re not in any groups yet. Create one and share the code, or
            enter a friend&apos;s code to join theirs.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">{activeGroup.name}</h2>
              <button
                onClick={copyCode}
                className="mt-0.5 text-xs text-white/50 transition-colors hover:text-cyan-400"
                title="Copy invite code"
              >
                Invite code:{' '}
                <span className="font-mono font-bold tracking-widest text-cyan-400">
                  {activeGroup.code}
                </span>{' '}
                {copied ? '✓ copied' : '⧉'}
              </button>
            </div>
            <button
              onClick={handleLeave}
              disabled={busy}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-red-400/40 hover:text-red-400 disabled:opacity-40"
            >
              Leave group
            </button>
          </div>

          {entriesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => {
                const isYou = entry.user_id === user.id
                return (
                  <motion.li
                    key={entry.user_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm ${
                      isYou
                        ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="w-8 text-center text-lg font-bold tabular-nums text-white/50">
                      {entry.rank}
                    </span>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5 ring-2 ring-cyan-500/40">
                      <Image
                        src={
                          (isYou ? avatarUrl : entry.avatar_url) ||
                          entry.avatar_url ||
                          '/assets/default-avatar.png'
                        }
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover object-top"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-white">
                      {entry.display_name}
                      {isYou && (
                        <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                          You
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col items-end leading-tight">
                      <span className="text-lg font-bold tabular-nums text-cyan-400">
                        {entry.current_streak > 0 ? `🔥 ${entry.current_streak}` : '—'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-white/40">
                        {entry.daily_wins} daily wins
                      </span>
                    </span>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
