"use client"

import { createContext, useContext, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

type SupabaseContextValue = {
  supabase: ReturnType<typeof createClient>
  initialUser: User | null
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: User | null
}) {
  const supabase = useMemo(() => createClient(), [])
  return (
    <SupabaseContext.Provider value={{ supabase, initialUser }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase must be used inside SupabaseProvider')
  return ctx
}
