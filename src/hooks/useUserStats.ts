// src/hooks/useUserStats.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useAuth } from './useAuth';

export interface ModeTotal {
  mode: string;
  total_games: number;
  total_wins: number;
  win_rate: number;
  current_streak: number;
  max_streak: number;
  total_hints_used: number;
}

export interface HintTotal {
  hint_type: string;
  wins_with_hint: number;
  total_uses: number;
}

export interface GameSessionRow {
  id: string;
  mode: string;
  win: boolean;
  guesses_made: number;
  hints_revealed: number;
  created_at: string;
}

const RECENT_SESSIONS_LIMIT = 50;

export function useUserStats() {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [modeTotals, setModeTotals] = useState<ModeTotal[]>([]);
  const [hintTotals, setHintTotals] = useState<HintTotal[]>([]);
  const [recentSessions, setRecentSessions] = useState<GameSessionRow[]>([]);

  useEffect(() => {
    if (!user) {
      setModeTotals([]);
      setHintTotals([]);
      setRecentSessions([]);
      setLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const [modeRes, hintRes, sessionsRes] = await Promise.all([
          supabase.from('user_mode_totals').select('*'),
          supabase
            .from('user_hint_totals')
            .select('*')
            .order('wins_with_hint', { ascending: false }),
          supabase
            .from('game_sessions')
            .select('id, mode, win, guesses_made, hints_revealed, created_at')
            .order('created_at', { ascending: false })
            .limit(RECENT_SESSIONS_LIMIT),
        ]);

        if (modeRes.error) console.error('Error fetching mode totals:', modeRes.error);
        if (hintRes.error) console.error('Error fetching hint totals:', hintRes.error);
        if (sessionsRes.error) console.error('Error fetching game sessions:', sessionsRes.error);

        setModeTotals(modeRes.data ?? []);
        setHintTotals(hintRes.data ?? []);
        setRecentSessions(sessionsRes.data ?? []);
      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user, supabase]);

  return { loading, modeTotals, hintTotals, recentSessions };
}