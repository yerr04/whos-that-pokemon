'use client'

import { useAchievements } from '@/hooks/useAchievements'
import { ACHIEVEMENTS } from '@/data/achievements'
import { TRAINER_SPRITES } from '@/data/trainerSprites'

/**
 * Badge wall for the profile page. Reads unlocked ids from
 * user_achievements; definitions (name/icon/description) come from
 * src/data/achievements.ts. Badges that also unlock a trainer sprite say so.
 */
export function AchievementsGrid() {
  const { unlocked, loading } = useAchievements()

  const spriteRewardByAchievement = new Map(
    TRAINER_SPRITES.filter((s) => s.unlockAchievement).map((s) => [
      s.unlockAchievement as string,
      s.label,
    ]),
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-violet-600/80 to-violet-500/80 border-b border-violet-400/20">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Achievements
        </h2>
        <span className="text-xs font-medium text-white/80">
          {unlocked.size}/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <p className="text-sm text-white/40">Loading achievements…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlocked.has(a.id)
              const spriteReward = spriteRewardByAchievement.get(a.id)
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isUnlocked
                      ? 'border-amber-400/40 bg-amber-400/10'
                      : 'border-white/10 bg-white/[0.03] opacity-60'
                  }`}
                  title={a.description}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>
                      {isUnlocked ? a.icon : '🔒'}
                    </span>
                    <span
                      className={`text-sm font-semibold leading-tight ${
                        isUnlocked ? 'text-amber-300' : 'text-white/60'
                      }`}
                    >
                      {a.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/40 leading-snug">
                    {a.description}
                  </p>
                  {spriteReward && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-cyan-400/80">
                      {isUnlocked ? 'Unlocked' : 'Unlocks'}: {spriteReward} avatar
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
