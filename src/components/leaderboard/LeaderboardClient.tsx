'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useLeaderboard,
  type LeaderboardKey,
  type LeaderboardEntry,
} from '@/hooks/useLeaderboard'
import { useAuth } from '@/hooks/useAuth'
import { FriendsBoard } from './FriendsBoard'

interface TabConfig {
  key: LeaderboardKey
  label: string
  blurb: string
  /** Renders the score value for one entry. */
  formatScore: (entry: LeaderboardEntry) => string
  scoreCaption: string
}

const TABS: TabConfig[] = [
  {
    key: 'least_hints',
    label: 'Fewest Hints',
    blurb: 'Daily challengers who win using the fewest hints on average.',
    formatScore: (e) => e.score.toFixed(2),
    scoreCaption: 'avg hints',
  },
  {
    key: 'longest_streak',
    label: 'Longest Streak',
    blurb: 'Trainers with the longest daily challenge streaks ever recorded.',
    formatScore: (e) => String(Math.round(e.score)),
    scoreCaption: 'day streak',
  },
  {
    key: 'most_games',
    label: 'Most Games',
    blurb: 'The most dedicated trainers by total games completed.',
    formatScore: (e) => String(Math.round(e.score)),
    scoreCaption: 'games',
  },
]

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-300',
  2: 'text-slate-200',
  3: 'text-orange-400',
}

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_STYLES[rank] ?? 'text-white/50'
  return (
    <span className={`w-8 text-center text-lg font-bold tabular-nums ${color}`}>
      {rank}
    </span>
  )
}

function LeaderboardRow({
  entry,
  tab,
  index,
  isYou = false,
  avatarOverride,
}: {
  entry: LeaderboardEntry
  tab: TabConfig
  index: number
  isYou?: boolean
  avatarOverride?: string | null
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm ${
        isYou
          ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/40'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <RankBadge rank={entry.rank} />

      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5 ring-2 ring-cyan-500/40">
        <Image
          src={entry.avatar_url || avatarOverride || '/assets/default-avatar.png'}
          alt=""
          fill
          sizes="40px"
          className="object-cover object-top"
        />
      </span>

      <span className="min-w-0 flex-1 truncate font-semibold text-white">
        {entry.display_name}
        {isYou && (
          <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300 align-middle">
            You
          </span>
        )}
      </span>

      <span className="flex flex-col items-end leading-tight">
        <span className="text-lg font-bold tabular-nums text-cyan-400">
          {tab.formatScore(entry)}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-white/40">
          {tab.scoreCaption}
        </span>
      </span>
    </motion.li>
  )
}

function UnrankedYouCard({
  name,
  avatar,
  tab,
}: {
  name: string
  avatar: string | null
  tab: TabConfig
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-cyan-400/60 bg-cyan-500/10 px-4 py-3 ring-1 ring-cyan-400/40 backdrop-blur-sm">
      <span className="w-8 text-center text-lg font-bold text-white/40">—</span>

      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5 ring-2 ring-cyan-500/40">
        <Image
          src={avatar || '/assets/default-avatar.png'}
          alt=""
          fill
          sizes="40px"
          className="object-cover object-top"
        />
      </span>

      <span className="min-w-0 flex-1 truncate font-semibold text-white">
        {name}
        <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300 align-middle">
          You
        </span>
      </span>

      <span className="flex flex-col items-end leading-tight">
        <span className="text-sm font-semibold text-white/50">Not ranked yet</span>
        <span className="text-[10px] uppercase tracking-wide text-white/40">
          {tab.scoreCaption}
        </span>
      </span>
    </li>
  )
}

function YouGap() {
  return (
    <li className="flex justify-center py-1 text-white/30" aria-hidden>
      <span className="text-xl leading-none tracking-widest">···</span>
    </li>
  )
}

export function LeaderboardClient() {
  const [activeKey, setActiveKey] = useState<LeaderboardKey | 'friends'>('least_hints')
  const isFriends = activeKey === 'friends'
  const boardKey: LeaderboardKey = isFriends ? 'least_hints' : activeKey
  const activeTab = TABS.find((t) => t.key === boardKey)!
  const { entries, myEntry, loading, error } = useLeaderboard(boardKey, 10)
  const { user, avatarUrl } = useAuth()

  const youInList = !!user && entries.some((e) => e.user_id === user.id)
  const showYouCard = !!user && !youInList && !loading && !error

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-cyan-500">Leaderboard</h1>
        <p className="mt-2 text-sm text-white/50">
          {isFriends
            ? 'Private boards for you and your friends — join with an invite code.'
            : activeTab.blurb}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {TABS.map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors ${
              tab.key === activeKey
                ? 'bg-cyan-500 text-[#0d1a26]'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab.label}
          </motion.button>
        ))}
        <motion.button
          onClick={() => setActiveKey('friends')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors ${
            isFriends ? 'bg-cyan-500 text-[#0d1a26]' : 'bg-white/10 hover:bg-white/20'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Friends
        </motion.button>
      </div>

      {isFriends && <FriendsBoard />}

      {/* Board */}
      {!isFriends && (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-red-400">
            Could not load the leaderboard. Please try again later.
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-white/50">
            No trainers on this board yet. Be the first to claim a spot!
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.ul
              key={activeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {entries.map((entry, index) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  tab={activeTab}
                  index={index}
                  isYou={!!user && entry.user_id === user.id}
                  avatarOverride={
                    !!user && entry.user_id === user.id ? avatarUrl : undefined
                  }
                />
              ))}

              {showYouCard &&
                (myEntry ? (
                  <>
                    <YouGap />
                    <LeaderboardRow
                      entry={myEntry}
                      tab={activeTab}
                      index={entries.length}
                      isYou
                      avatarOverride={avatarUrl}
                    />
                  </>
                ) : (
                  <>
                    <YouGap />
                    <UnrankedYouCard name="You" avatar={avatarUrl} tab={activeTab} />
                  </>
                ))}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>
      )}
    </div>
  )
}
