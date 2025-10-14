// src/utils/stats.ts
import { createClient } from '@/utils/supabase/client';
import { HintType } from '@/types/game';

const supabase = createClient();

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
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return; // silently bail for anonymous users

  await supabase.rpc('apply_game_result', {
    p_mode: mode,
    p_user_id: userId,
    p_win: won,
    p_guesses_made: guessesMade,
    p_hints_revealed: hintsRevealed,
    p_hint_type_on_win: hintTypeOnWin,
    p_daily_date: dailyDateKey ? dailyDateKey : null,
    p_hint_sequence: hintSequence,
    p_pokemon_id: pokemonId,
  });
}
