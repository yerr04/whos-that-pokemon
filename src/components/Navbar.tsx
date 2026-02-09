'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { useSupabase } from './SupabaseProvider'

const MotionLink = motion.create(Link)

type Props = { initialUser: User | null }

export function Navbar({ initialUser }: Props) {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<User | null>(initialUser)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Update user when initialUser prop changes (e.g., after OAuth redirect)
  useEffect(() => {
    setUser(initialUser)
  }, [initialUser])

  // Listen for auth state changes (including OAuth sign-in)
  // Don't call getSession/getUser here - middleware and layout handle that
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub?.subscription?.unsubscribe()
  }, [supabase])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <div className="fixed inset-x-0 top-4 z-50 pointer-events-none px-4 md:px-48">
      <nav
        className="
          pointer-events-auto mx-auto max-w-6xl px-3
          rounded-full border border-white/10
          bg-white/10 backdrop-blur-sm supports-[backdrop-filter]:bg-white/10
          shadow-lg shadow-black/20 p-2
        "
      >
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <MotionLink
            href="/"
            className="flex items-center gap-2 pl-2 flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Image
              src="/assets/pokenerdle.png"
              alt="PokéNerdle Logo"
              width={140}
              height={44}
              className="h-8 md:h-11 w-auto"
              priority
            />
          </MotionLink>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex pr-2">
            <MotionLink
              href="/daily"
              className="text-white/90 hover:text-cyan-500 transition-colors"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              Daily Challenge
            </MotionLink>
            <MotionLink
              href="/unlimited"
              className="text-white/90 hover:text-cyan-500 transition-colors"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              Unlimited Mode
            </MotionLink>

            {user ? (
              <MotionLink
                href="/profile"
                className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-cyan-500/60 hover:ring-cyan-400/80 transition block"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src={user.user_metadata?.avatar_url || '/assets/default-avatar.png'}
                  alt="Profile"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </MotionLink>
            ) : (
              <MotionLink
                href="/auth/sign-in"
                className="w-24 rounded-full bg-cyan-500 px-4 py-2 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
              >
                Log In
              </MotionLink>
            )}
          </div>

          {/* Mobile toggle */}
          <motion.button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="md:hidden rounded-full p-2 text-white/90 hover:text-white"
            aria-label="Toggle menu"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </motion.button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {/* Menu */}
            <motion.div
              key="menu"
              ref={menuRef}
              className="
                pointer-events-auto relative z-50
                md:hidden mx-auto mt-3 w-[calc(100%-2rem)] max-w-sm
                rounded-2xl border border-white/10
                bg-white/10 backdrop-blur-md supports-[backdrop-filter]:bg-white/10
                shadow-lg shadow-black/20
              "
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <motion.div
                className="px-4 py-3 space-y-1"
                initial="closed"
                animate="open"
                variants={{
                  open: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
                  closed: {},
                }}
              >
                <MotionLink
                  href="/daily"
                  className="block rounded-md px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white transition text-base"
                  onClick={() => setIsMenuOpen(false)}
                  variants={{ open: { opacity: 1, x: 0 }, closed: { opacity: 0, x: -8 } }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Daily Challenge
                </MotionLink>
                <MotionLink
                  href="/unlimited"
                  className="block rounded-md px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white transition text-base"
                  onClick={() => setIsMenuOpen(false)}
                  variants={{ open: { opacity: 1, x: 0 }, closed: { opacity: 0, x: -8 } }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Unlimited Mode
                </MotionLink>

                {user ? (
                  <MotionLink
                    href="/profile"
                    className="flex items-center gap-3 rounded-md px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white transition text-base border-t border-white/10 mt-2 pt-3"
                    onClick={() => setIsMenuOpen(false)}
                    variants={{ open: { opacity: 1, x: 0 }, closed: { opacity: 0, x: -8 } }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-cyan-500/60 flex-shrink-0">
                      <Image
                        src={user.user_metadata?.avatar_url || '/assets/default-avatar.png'}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="h-8 w-8 object-cover"
                      />
                    </span>
                    <span>Profile</span>
                  </MotionLink>
                ) : (
                  <MotionLink
                    href="/auth/sign-in"
                    className="block rounded-full bg-cyan-500 px-4 py-3 text-center font-semibold text-[#0d1a26] hover:bg-cyan-400 transition-colors mt-3"
                    onClick={() => setIsMenuOpen(false)}
                    variants={{ open: { opacity: 1, x: 0 }, closed: { opacity: 0, x: -8 } }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Log In
                  </MotionLink>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
