// src/utils/stats.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { HintType, Difficulty } from '@/types/game';

type RecordGameInput = {
  mode: 'daily' | 'unlimited';
  pokemonId: number;
  guessesMade: number;
  hintsRevealed: number;
  hintSequence: HintType[];
  won: boolean;
  hintTypeOnWin: HintType | null;
  dailyDateKey?: string;
  supabase: SupabaseClient;
  difficulty?: Difficulty;
};

export type GameResultSummary = {
  /** false when this daily was already recorded (duplicate submission) */
  counted: boolean;
  /** true when the result affected the streak (today's daily / unlimited) */
  counts_for_streak?: boolean;
  current_streak: number;
  streak_freezes: number;
};

/**
 * Records a finished game via the apply_game_result RPC. The server derives
 * the user from the session (auth.uid()), applies date-aware streak logic and
 * returns the updated streak + freeze count.
 */
export async function recordGameResult({
  mode,
  pokemonId,
  guessesMade,
  hintsRevealed,
  hintSequence,
  won,
  hintTypeOnWin,
  dailyDateKey,
  supabase,
  difficulty,
}: RecordGameInput): Promise<GameResultSummary | null> {
  const { data, error } = await supabase.rpc('apply_game_result', {
    p_mode: mode,
    p_win: won,
    p_guesses_made: guessesMade,
    p_hints_revealed: hintsRevealed,
    p_hint_type_on_win: hintTypeOnWin ?? null,
    p_daily_date: dailyDateKey ?? null,
    p_hint_sequence: hintSequence,
    p_pokemon_id: pokemonId,
    p_difficulty: difficulty ?? null,
  });

  if (error) {
    console.error('Failed to record game result:', error);
    throw error;
  }

  return (data as GameResultSummary | null) ?? null;
}
