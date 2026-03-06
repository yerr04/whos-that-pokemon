"use client"
import { useState, useRef, useEffect, useCallback, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePokemonList, PokemonSuggestion } from '@/hooks/usePokemonList'
import { capitalize } from '@/utils/pokemon'

interface PokemonAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
}

export function PokemonAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = "Who's that Pokémon?",
}: PokemonAutocompleteProps) {
  const { search, loading: listLoading } = usePokemonList()
  const [suggestions, setSuggestions] = useState<PokemonSuggestion[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateSuggestions = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSuggestions([])
        setIsOpen(false)
        return
      }
      const results = search(query)
      setSuggestions(results)
      setHighlightIndex(-1)
      setIsOpen(results.length > 0)
    },
    [search],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateSuggestions(value), 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, updateSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectSuggestion(name: string) {
    onChange(name)
    setSuggestions([])
    setIsOpen(false)
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        if (highlightIndex >= 0) {
          e.preventDefault()
          selectSuggestion(suggestions[highlightIndex].name)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative flex-grow">
      <form onSubmit={onSubmit} id="guess-form" className="flex space-x-2 justify-center">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (value.trim() && suggestions.length > 0) setIsOpen(true)
            }}
            placeholder={listLoading ? 'Loading Pokémon...' : placeholder}
            autoComplete="off"
            className="w-full bg-white rounded-full px-3 py-2 text-black border-6 border-cyan-500 focus:outline-none focus:ring-2 focus:ring-[#206d46] transition-colors"
          />

          <AnimatePresence>
            {isOpen && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 left-0 right-0 mt-1 bg-[#1f2b3d] border border-cyan-500/40 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
                role="listbox"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.id}
                    role="option"
                    aria-selected={i === highlightIndex}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectSuggestion(s.name)
                    }}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                      i === highlightIndex
                        ? 'bg-cyan-500/20'
                        : 'hover:bg-cyan-500/10'
                    }`}
                  >
                    <img
                      src={s.spriteUrl}
                      alt={s.name}
                      width={36}
                      height={36}
                      className="pixelated"
                      loading="lazy"
                    />
                    <span className="text-white font-medium">
                      {s.displayName || capitalize(s.name)}
                    </span>
                    <span className="text-gray-500 text-xs ml-auto">
                      #{String(s.id).padStart(4, '0')}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          className="px-8 py-2 bg-cyan-500 text-black rounded-full hover:bg-cyan-400 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
        >
          Enter
        </motion.button>
      </form>
    </div>
  )
}
