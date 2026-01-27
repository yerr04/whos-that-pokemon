// whos-that-pokemon/src/hooks/useAuth.ts
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/SupabaseProvider';

export function useAuth() {
  const { supabase, initialUser } = useSupabase();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false); // Start with false since we have initialUser

  const refreshUser = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (error.name !== 'AuthSessionMissingError' && error.status !== 401) {
        console.error('Failed to fetch authenticated user:', error);
      }

      setUser(null);
    } else {
      setUser(data.user ?? null);
    }

    setLoading(false);
  }, [supabase]);

  // Update user when initialUser prop changes (e.g., after OAuth redirect)
  useEffect(() => {
    setUser(initialUser ?? null);
  }, [initialUser]);

  // Only listen for auth state changes - don't call getUser on mount
  // since middleware and layout already handle initial user state
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Update user immediately from session to avoid extra getUser call
      setUser(session?.user ?? null);
      
      // Only refresh if we need to (e.g., token refresh events)
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        refreshUser();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase, refreshUser]);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return { user, loading, avatarUrl, refreshUser };
}
