// src/hooks/useUserStats.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from './useAuth';

interface ModeTotal {
  mode: string;
  total_games: number;
  total_wins: number;
  win_rate: number;
  current_streak: number;
  max_streak: number;
}

interface HintTotal {
  hint_type: string;
  wins_with_hint: number;
}

export function useUserStats() {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [modeTotals, setModeTotals] = useState<ModeTotal[]>([]);
  const [hintTotals, setHintTotals] = useState<HintTotal[]>([]);

  useEffect(() => {
    if (!user) {
      setModeTotals([]);
      setHintTotals([]);
      setLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const [modeRes, hintRes] = await Promise.all([
          supabase.from('user_mode_totals').select('*'),
          supabase.from('user_hint_totals').select('*').order('wins_with_hint', { ascending: false }),
        ]);

        if (modeRes.error) {
          console.error('Error fetching mode totals:', modeRes.error);
        }
        if (hintRes.error) {
          console.error('Error fetching hint totals:', hintRes.error);
        }

        setModeTotals(modeRes.data ?? []);
        setHintTotals(hintRes.data ?? []);
      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user, supabase]);

  return { loading, modeTotals, hintTotals };
}