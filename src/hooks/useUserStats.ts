// src/hooks/useUserStats.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
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
      const supabase = await createClient();

      Promise.all([
        supabase.from('user_mode_totals').select('*'),
        supabase.from('user_hint_totals').select('*').order('wins_with_hint', { ascending: false }),
      ]).then(([modeRes, hintRes]) => {
        setModeTotals(modeRes.data ?? []);
        setHintTotals(hintRes.data ?? []);
        setLoading(false);
      }).catch((err) => {
        console.error('Error fetching user stats:', err);
        setLoading(false);
      });
    };

    fetchUserStats();
  }, [user]);

  return { loading, modeTotals, hintTotals };
}