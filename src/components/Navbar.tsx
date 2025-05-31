'use client'
import Link from 'next/link'
import { useState } from 'react'

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-[#1f2b3d] border-b-2 border-[#55c58d] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <img 
              src="/assets/pokeball.svg" 
              alt="Pokeball" 
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-white">
              Who's That Pokémon?
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-white hover:text-[#55c58d] transition-colors"
            >
              Classic Mode
            </Link>
            <Link 
              href="/survival" 
              className="text-white hover:text-[#55c58d] transition-colors"
            >
              Survival Mode
            </Link>
            <Link 
              href="/timed" 
              className="text-white hover:text-[#55c58d] transition-colors"
            >
              Timed Mode
            </Link>
            <Link 
              href="/stats" 
              className="text-white hover:text-[#55c58d] transition-colors"
            >
              Stats
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#55c58d]">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Classic Mode
              </Link>
              <Link 
                href="/survival" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Survival Mode
              </Link>
              <Link 
                href="/timed" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Timed Mode
              </Link>
              <Link 
                href="/stats" 
                className="block px-3 py-2 text-white hover:text-[#55c58d] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Stats
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}