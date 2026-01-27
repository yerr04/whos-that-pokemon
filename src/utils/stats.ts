// src/utils/stats.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { HintType } from '@/types/game';

type RecordGameInput = {
  mode: 'daily' | 'unlimited';
  pokemonId: number;
  guessesMade: number;
  hintsRevealed: number;
  hintSequence: HintType[];
  won: boolean;
  hintTypeOnWin: HintType | null;
  dailyDateKey?: string;
  userId: string; // Accept userId as parameter to avoid redundant getUser() call
  supabase: SupabaseClient; // Accept supabase client to reuse context instance
};

export async function recordGameResult({
  mode,
  pokemonId,
  guessesMade,
  hintsRevealed,
  hintSequence,
  won,
  hintTypeOnWin,
  dailyDateKey,
  userId,
  supabase,
}: RecordGameInput) {
  console.log('Recording game result:', {
    mode,
    pokemonId,
    guessesMade,
    hintsRevealed,
    hintSequence,
    won,
    hintTypeOnWin,
    dailyDateKey,
    userId
  });

  const { data, error } = await supabase.rpc('apply_game_result', {
    p_mode: mode,
    p_user_id: userId,
    p_win: won,
    p_guesses_made: guessesMade,
    p_hints_revealed: hintsRevealed,
    p_hint_type_on_win: hintTypeOnWin,
    p_daily_date: dailyDateKey || null,
    p_hint_sequence: hintSequence,
    p_pokemon_id: pokemonId,
  });

  if (error) {
    console.error('Failed to record game result:', error);
    throw error;
  } else {
    console.log('Successfully recorded game result');
  }
}
