"use client"

import { createContext, useContext, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

type SupabaseContextValue = {
  supabase: ReturnType<typeof createClient>
  session: Session | null
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode
  initialSession?: Session | null
}) {
  const supabase = useMemo(() => createClient(), [])
  return (
    <SupabaseContext.Provider value={{ supabase, session: initialSession }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase must be used inside SupabaseProvider')
  return ctx
}