// whos-that-pokemon/src/hooks/useAuth.ts
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/SupabaseProvider';

export function useAuth() {
  const { supabase, session } = useSupabase();
  const [user, setUser] = useState<User | null>(session?.user ?? null);
  const [loading, setLoading] = useState(!session);

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

  useEffect(() => {
    setUser(session?.user ?? null);
    setLoading(!session);
  }, [session]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase, refreshUser]);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return { user, loading, avatarUrl, refreshUser };
}
