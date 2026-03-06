-- Migration: Add difficulty support and accommodate new hint types
-- Run AFTER the initial add_game_stats.sql migration

-- 1. Add difficulty column to game_sessions
alter table public.game_sessions
  add column if not exists difficulty text;

-- 2. Backfill existing rows with 'medium' (the legacy default)
update public.game_sessions
  set difficulty = 'medium'
  where difficulty is null;

-- 3. Replace apply_game_result to accept the new p_difficulty parameter
create or replace function public.apply_game_result(
  p_mode public.game_mode,
  p_user_id uuid,
  p_win boolean,
  p_guesses_made int,
  p_hints_revealed int,
  p_hint_type_on_win text,
  p_daily_date text,
  p_hint_sequence text[],
  p_pokemon_id int,
  p_difficulty text default null
) returns void
language plpgsql
security definer
as $$
declare
  hint_item text;
  daily_date_val date;
begin
  -- Parse daily_date if provided
  if p_daily_date is not null and p_daily_date != '' then
    daily_date_val := p_daily_date::date;
  end if;

  -- Insert game session (now includes difficulty)
  insert into public.game_sessions (
    user_id, mode, win, guesses_made, hints_revealed,
    hint_type_on_win, hint_sequence, daily_date, pokemon_id, difficulty
  ) values (
    p_user_id, 
    p_mode, 
    p_win, 
    p_guesses_made, 
    p_hints_revealed,
    p_hint_type_on_win, 
    p_hint_sequence,
    daily_date_val, 
    p_pokemon_id,
    p_difficulty
  )
  on conflict (user_id, daily_date) 
  where mode = 'daily'
  do nothing;

  -- Update mode totals (unchanged)
  insert into public.user_mode_totals (
    user_id, mode, total_games, total_wins, win_rate, 
    current_streak, max_streak, total_hints_used, updated_at
  )
  values (
    p_user_id, 
    p_mode, 
    1, 
    case when p_win then 1 else 0 end,
    case when p_win then 1.0 else 0.0 end,
    case when p_win then 1 else 0 end,
    case when p_win then 1 else 0 end,
    p_hints_revealed,
    now()
  )
  on conflict (user_id, mode)
  do update set
    total_games = user_mode_totals.total_games + 1,
    total_wins = user_mode_totals.total_wins + case when p_win then 1 else 0 end,
    win_rate = (user_mode_totals.total_wins + case when p_win then 1 else 0 end)::decimal / 
               (user_mode_totals.total_games + 1),
    current_streak = case 
      when p_win then user_mode_totals.current_streak + 1 
      else 0 
    end,
    max_streak = greatest(
      user_mode_totals.max_streak,
      case when p_win then user_mode_totals.current_streak + 1 else user_mode_totals.current_streak end
    ),
    total_hints_used = user_mode_totals.total_hints_used + p_hints_revealed,
    updated_at = now();

  -- Update hint totals (handles new hint types like specialStatus,
  -- evolutionMethod, splitEvolution, specialForms automatically since
  -- hint_type is a text column)
  if p_hint_sequence is not null then
    foreach hint_item in array p_hint_sequence
    loop
      insert into public.user_hint_totals (
        user_id, hint_type, wins_with_hint, total_uses
      )
      values (
        p_user_id, 
        hint_item, 
        case when p_win then 1 else 0 end, 
        1
      )
      on conflict (user_id, hint_type)
      do update set
        wins_with_hint = user_hint_totals.wins_with_hint + case when p_win then 1 else 0 end,
        total_uses = user_hint_totals.total_uses + 1;
    end loop;
  end if;

  if p_win and p_hint_type_on_win is not null then
    insert into public.user_hint_totals (
      user_id, hint_type, wins_with_hint, total_uses
    )
    values (p_user_id, p_hint_type_on_win, 1, 0)
    on conflict (user_id, hint_type)
    do update set
      wins_with_hint = user_hint_totals.wins_with_hint + 1;
  end if;
end;
$$;
