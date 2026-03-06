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
  userId: string;
  supabase: SupabaseClient;
  difficulty?: Difficulty;
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
  difficulty,
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
    userId,
    difficulty
  });

  const { data, error } = await supabase.rpc('apply_game_result', {
    p_mode: mode,
    p_user_id: userId,
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
  } else {
    console.log('Successfully recorded game result');
  }
}
