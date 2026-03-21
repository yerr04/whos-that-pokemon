'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TRAINER_SPRITES,
  SPRITE_CATEGORIES,
  getTrainerSpriteUrl,
  getRandomTrainerSprite,
} from '@/data/trainerSprites'

interface Props {
  currentSprite: string
  onSelect: (spriteUrl: string) => void
  onClose: () => void
}

export function TrainerSpritePicker({ currentSprite, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = useMemo(() => {
    let list = TRAINER_SPRITES
    if (activeCategory) list = list.filter((s) => s.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      )
    }
    return list
  }, [search, activeCategory])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d1a26] shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-red-600/90 to-red-500/90">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Choose Your Trainer
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelect(getTrainerSpriteUrl(getRandomTrainerSprite().id))}
                className="text-xs font-medium text-white/80 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40"
              >
                Random
              </button>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search + filters */}
          <div className="px-5 py-3 border-b border-white/10 space-y-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trainers…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  !activeCategory
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
                }`}
              >
                All
              </button>
              {SPRITE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeCategory === cat
                      ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-white/40 py-8">No trainers found.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {filtered.map((sprite) => {
                  const url = getTrainerSpriteUrl(sprite.id)
                  const isActive = currentSprite === url
                  return (
                    <button
                      key={sprite.id}
                      onClick={() => onSelect(url)}
                      className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        isActive
                          ? 'border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                          : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                      }`}
                      title={sprite.label}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={sprite.label}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-[10px] text-white/50 group-hover:text-white/70 truncate w-full text-center leading-tight">
                        {sprite.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
