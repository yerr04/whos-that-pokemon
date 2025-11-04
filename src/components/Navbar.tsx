'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

type Props = {
  initialUser: User | null
}

export function Navbar({ initialUser }: Props) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <nav className="border-b border-cyan-500 sticky top-0 z-50 bg-slate-950/75 backdrop-blur-md shadow-2xl shadow-cyan-500/50 ">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/assets/pokeball.svg" alt="Pokeball" className="w-8 h-8" />
            <img src="/assets/pokenerdle.png" className="h-11 pb-1.25" alt="PokéNerdle Logo" />
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/daily" className="text-white hover:text-[#55c58d] transition-colors">
              Daily Challenge
            </Link>
            <Link href="/unlimited" className="text-white hover:text-[#55c58d] transition-colors">
              Unlimited Mode
            </Link>

            {user ? (
              <Link href="/profile" className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-cyan-500">
                <Image
                  src={user.user_metadata?.avatar_url || '/assets/default-avatar.png'}
                  alt="Profile"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </Link>
            ) : (
              <Link
                href="/auth/sign-in"
                className="px-4 py-2 rounded-full bg-cyan-500 text-[#0d1a26] text-center font-semibold hover:bg-cyan-400 transition-colors w-24"
              >
                Log In
              </Link>
            )}
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-[#55c58d]">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/daily" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Daily Challenge
              </Link>
              <Link 
                href="/unlimited" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Unlimited Mode
              </Link>
              {user ? (
                <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-white hover:text-[#55c58d]" onClick={() => setIsMenuOpen(false)}>
                  <div className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-cyan-500">
                    <Image src={user.user_metadata?.avatar_url || '/assets/default-avatar.png'} alt="Profile" width={32} height={32} className="object-cover" />
                  </div>
                  Profile
                </Link>
              ) : (
                <Link href="/auth/sign-in" className="block px-3 py-2 text-white hover:text-[#55c58d]" onClick={() => setIsMenuOpen(false)}>
                  Log In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}