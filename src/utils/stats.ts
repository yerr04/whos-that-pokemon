// src/utils/stats.ts
import { createClient } from '@/utils/supabase/client';
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
}: RecordGameInput) {
  const supabase = createClient(); // Move inside the function
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.warn('No authenticated user, skipping game result recording');
    return;
  }

  console.log('Recording game result:', {
    mode,
    pokemonId,
    guessesMade,
    hintsRevealed,
    hintSequence,
    won,
    hintTypeOnWin,
    dailyDateKey,
    userId: user.id
  });

  const { data, error } = await supabase.rpc('apply_game_result', {
    p_mode: mode,
    p_user_id: user.id,
    p_win: won,
    p_guesses_made: guessesMade,
    p_hints_revealed: hintsRevealed,
    p_hint_type_on_win: hintTypeOnWin,
    p_daily_date: dailyDateKey || null,
    p_hint_sequence: hintSequence, // Make sure this is a string array, not a JSON object
    p_pokemon_id: pokemonId,
  });

  if (error) {
    console.error('Failed to record game result:', error);
  } else {
    console.log('Successfully recorded game result');
  }
}
