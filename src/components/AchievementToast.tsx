'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ACHIEVEMENTS_BY_ID } from '@/data/achievements'

/**
 * Inline "Achievement unlocked!" banner shown on the game screen right after
 * a result is recorded. `ids` comes straight from check_achievements(), so it
 * only ever contains achievements earned by the game that just finished.
 */
export function AchievementToast({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {ids.map((id, i) => {
        const def = ACHIEVEMENTS_BY_ID[id]
        if (!def) return null
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 300, damping: 20 }}
            className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5"
          >
            <span className="text-2xl">{def.icon}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
                Achievement unlocked
              </span>
              <span className="block truncate text-sm font-semibold text-amber-300">
                {def.name}
              </span>
            </span>
            <Link
              href="/profile"
              className="shrink-0 text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
            >
              View
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
