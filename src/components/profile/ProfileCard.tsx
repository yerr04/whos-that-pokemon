'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUserStats'
import {
  getTrainerSpriteUrl,
  getRandomTrainerSprite,
  isTrainerSpriteUrl,
} from '@/data/trainerSprites'
import { TrainerSpritePicker } from './TrainerSpritePicker'

interface ProfileData {
  id: string
  email: string | null
  avatar_url: string | null
  full_name: string | null
  created_at: string | null
}

function getTrainerAbility(
  totalGames: number,
  winRate: number,
  bestStreak: number,
) {
  if (totalGames === 0)
    return { name: 'Newcomer', desc: 'Just starting their trainer journey.' }
  if (winRate >= 80)
    return { name: 'Ace Trainer', desc: 'Maintains an exceptional win record.' }
  if (bestStreak >= 10)
    return { name: 'Streak Master', desc: 'Known for incredible winning streaks.' }
  if (totalGames >= 100)
    return { name: 'Veteran', desc: 'A seasoned trainer with vast experience.' }
  if (totalGames >= 10)
    return { name: 'Rising Star', desc: 'A promising trainer gaining experience.' }
  return { name: 'Trainer', desc: 'Dedicated to becoming the very best.' }
}

function StatBar({
  label,
  value,
  display,
  max,
  color,
}: {
  label: string
  value: number
  display: string
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-medium text-white/50 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="w-10 text-right text-sm font-bold text-white tabular-nums shrink-0">
        {display}
      </span>
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ProfileCard({
  initialProfile,
}: {
  initialProfile: ProfileData | null
}) {
  const { supabase } = useSupabase()
  const { user, refreshUser } = useAuth()
  const { loading: statsLoading, modeTotals } = useUserStats()

  const [displayName, setDisplayName] = useState(
    initialProfile?.full_name || user?.user_metadata?.full_name || '',
  )
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatar_url || user?.user_metadata?.avatar_url || '',
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [editName, setEditName] = useState(displayName)
  const [editAvatar, setEditAvatar] = useState(avatarUrl)
  const [saveMsg, setSaveMsg] = useState<{
    ok: boolean
    text: string
  } | null>(null)

  const autoAssignAvatarRef = useRef(false)

  // Auto-assign a random trainer sprite once when user is known and avatar is not already Showdown
  useEffect(() => {
    if (!user) return
    if (autoAssignAvatarRef.current) return

    const effectiveAvatar =
      initialProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? ''
    if (isTrainerSpriteUrl(effectiveAvatar)) return

    autoAssignAvatarRef.current = true
    const sprite = getRandomTrainerSprite()
    const url = getTrainerSpriteUrl(sprite.id)
    setAvatarUrl(url)
    setEditAvatar(url)

    const persist = async () => {
      try {
        await Promise.all([
          supabase.auth.updateUser({ data: { avatar_url: url } }),
          supabase.from('profiles').upsert({
            id: user.id,
            avatar_url: url,
            updated_at: new Date().toISOString(),
          }),
        ])
        refreshUser()
      } catch (err) {
        console.error('Failed to auto-assign avatar:', err)
        autoAssignAvatarRef.current = false
      }
    }
    persist()
  }, [user, initialProfile?.avatar_url, supabase, refreshUser])

  const totalGames = modeTotals.reduce((s, m) => s + m.total_games, 0)
  const totalWins = modeTotals.reduce((s, m) => s + m.total_wins, 0)
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
  const currentStreak = modeTotals.reduce((s, m) => s + m.current_streak, 0)
  const bestStreak = Math.max(0, ...modeTotals.map((m) => m.max_streak))
  const ability = getTrainerAbility(totalGames, winRate, bestStreak)

  const joinDate = initialProfile?.created_at
    ? new Date(initialProfile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '—'

  const handleStartEdit = () => {
    setEditName(displayName)
    setEditAvatar(avatarUrl)
    setIsEditing(true)
    setSaveMsg(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSaveMsg(null)
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setSaveMsg(null)

    try {
      const [authRes, profileRes] = await Promise.all([
        supabase.auth.updateUser({
          data: { full_name: editName, avatar_url: editAvatar },
        }),
        supabase.from('profiles').upsert({
          id: user.id,
          full_name: editName,
          avatar_url: editAvatar,
          email: user.email,
          updated_at: new Date().toISOString(),
        }),
      ])

      if (authRes.error) throw authRes.error
      if (profileRes.error) throw profileRes.error

      setDisplayName(editName)
      setAvatarUrl(editAvatar)
      setIsEditing(false)
      setSaveMsg({ ok: true, text: 'Profile saved!' })
      refreshUser()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.'
      console.error('Failed to save profile:', err)
      setSaveMsg({ ok: false, text: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const shownAvatar = isEditing ? editAvatar : avatarUrl
  const shownName = isEditing ? editName : displayName

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        {/* Red header bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-red-600/90 to-red-500/90 border-b border-red-400/20">
          <div className="flex items-center gap-2">
            <PokeballIcon />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Trainer Card
            </h1>
          </div>
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="text-xs font-medium text-white/80 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40"
            >
              Edit
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row">
          {/* Left — sprite */}
          <div className="flex flex-col items-center justify-center p-8 md:w-2/5 bg-gradient-to-b from-white/[0.03] to-transparent md:border-r border-b md:border-b-0 border-white/10">
            <div className="relative w-40 h-40 md:w-48 md:h-48 mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-500/10" />
              {shownAvatar && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={shownAvatar}
                  alt="Trainer sprite"
                  className="relative w-full h-full object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                />
              )}
            </div>

            <div className="text-center mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-center text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 w-52"
                  maxLength={24}
                />
              ) : (
                <h2 className="text-xl font-bold text-white">
                  {shownName || 'Trainer'}
                </h2>
              )}
              <p className="text-[11px] text-white/30 mt-1 uppercase tracking-[0.2em]">
                Pokémon Trainer
              </p>
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setEditAvatar(
                      getTrainerSpriteUrl(getRandomTrainerSprite().id),
                    )
                  }
                  className="text-xs font-medium text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/5"
                >
                  Randomize
                </button>
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-xs font-medium text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/5"
                >
                  Choose Avatar
                </button>
              </div>
            )}
          </div>

          {/* Right — info + stats */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            {/* Profile info */}
            <div>
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
                Profile
              </h3>
              <div className="space-y-2.5">
                <InfoRow label="Name" value={shownName || 'Trainer'} />
                <InfoRow label="Email" value={user?.email || '—'} muted />
                <InfoRow label="Joined" value={joinDate} muted />
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Stats */}
            <div>
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4">
                Stats
              </h3>
              {statsLoading ? (
                <p className="text-sm text-white/40">Loading stats…</p>
              ) : (
                <div className="space-y-3">
                  <StatBar
                    label="Games"
                    value={totalGames}
                    display={String(totalGames)}
                    max={Math.max(50, totalGames)}
                    color="bg-cyan-400"
                  />
                  <StatBar
                    label="Win Rate"
                    value={winRate}
                    display={`${winRate}%`}
                    max={100}
                    color="bg-emerald-400"
                  />
                  <StatBar
                    label="Streak"
                    value={currentStreak}
                    display={String(currentStreak)}
                    max={Math.max(15, bestStreak, currentStreak)}
                    color="bg-amber-400"
                  />
                  <StatBar
                    label="Best"
                    value={bestStreak}
                    display={String(bestStreak)}
                    max={Math.max(15, bestStreak)}
                    color="bg-violet-400"
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Ability */}
            <div>
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">
                Ability
              </h3>
              <p className="text-sm font-semibold text-cyan-400">
                {ability.name}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{ability.desc}</p>
            </div>

            {/* Save feedback */}
            {saveMsg && (
              <div
                className={`text-sm px-3 py-2 rounded-lg ${
                  saveMsg.ok
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {saveMsg.text}
              </div>
            )}

            {/* Edit actions */}
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPicker && (
        <TrainerSpritePicker
          currentSprite={editAvatar}
          onSelect={(url) => {
            setEditAvatar(url)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-white/40">{label}</span>
      <span
        className={`text-sm font-medium ${muted ? 'text-white/50' : 'text-white'}`}
      >
        {value}
      </span>
    </div>
  )
}

function PokeballIcon() {
  return (
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="15" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
