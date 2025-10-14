-- Profiles (optional, mirrors auth.users for display data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  avatar_url text,
  full_name text,
  updated_at timestamptz default now()
);

-- Raw game sessions (one row per finished game)
create type public.game_mode as enum ('daily', 'unlimited');

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.game_mode not null,
  daily_date date,
  pokemon_id int,
  guesses_made int not null,
  hints_revealed int not null,
  hint_type_on_win text,
  hint_sequence text[] not null,
  win boolean not null,
  created_at timestamptz not null default now()
);

create unique index if not exists game_sessions_user_daily_unique
  on public.game_sessions(user_id, daily_date)
  where mode = 'daily';

-- Aggregated stats per user+mode
create table public.user_mode_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.game_mode not null,
  games_played int not null default 0,
  wins int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  total_correct int not null default 0,
  total_hints_used int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

-- Hint performance aggregates
create table public.user_hint_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  hint_type text not null,
  wins_with_hint int not null default 0,
  guesses_with_hint int not null default 0,
  primary key (user_id, hint_type)
);

-- Function to apply one finished game to aggregates
create or replace function public.apply_game_result(
  p_mode text,
  p_user_id uuid,
  p_win boolean,
  p_guesses_made int,
  p_hints_revealed int,
  p_hint_type_on_win text,
  p_daily_date text,
  p_hint_sequence jsonb,
  p_pokemon_id int
) returns void
language plpgsql
as $$
declare
  prev_streak int;
  new_streak int;
begin
  insert into public.game_sessions (
    user_id, mode, win, guesses_made, hints_revealed,
    hint_type_on_win, hint_sequence, daily_date, pokemon_id
  ) values (
    p_user_id, p_mode, p_win, p_guesses_made, p_hints_revealed,
    p_hint_type_on_win, coalesce(current_setting('app.hint_sequence', true)::text[], '{}'),
    p_daily_date, nullif(current_setting('app.pokemon_id', true), '')::int
  );

  insert into public.user_mode_totals as agg (
    user_id, mode, games_played, wins, current_streak, longest_streak,
    total_correct, total_hints_used, updated_at
  )
  values (
    p_user_id, p_mode, 1, case when p_win then 1 else 0 end,
    case when p_win then 1 else 0 end,
    case when p_win then 1 else 0 end,
    case when p_win then 1 else 0 end,
    case when p_win then p_hints_revealed else 0 end,
    now()
  )
  on conflict (user_id, mode)
  do update set
    games_played = agg.games_played + 1,
    wins = agg.wins + case when p_win then 1 else 0 end,
    total_correct = agg.total_correct + case when p_win then 1 else 0 end,
    total_hints_used = agg.total_hints_used + case when p_win then p_hints_revealed else 0 end,
    current_streak = case
      when p_mode = 'daily' then
        case when p_win then agg.current_streak + 1 else 0 end
      else
        case when p_win then agg.current_streak + 1 else 0 end
    end,
    longest_streak = greatest(agg.longest_streak,
      case when p_win then agg.current_streak + 1 else agg.longest_streak end),
    updated_at = now();

  if p_hint_type_on_win is not null then
    insert into public.user_hint_totals as hint (
      user_id, hint_type, wins_with_hint, guesses_with_hint
    )
    values (p_user_id, p_hint_type_on_win, case when p_win then 1 else 0 end, p_guesses_made)
    on conflict (user_id, hint_type)
    do update set
      wins_with_hint = hint.wins_with_hint + case when p_win then 1 else 0 end,
      guesses_with_hint = hint.guesses_with_hint + p_guesses_made;
  end if;
end;
$$;

-- RLS policies
alter table public.game_sessions enable row level security;
alter table public.user_mode_totals enable row level security;
alter table public.user_hint_totals enable row level security;

create policy "Users can manage their sessions"
  on public.game_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read/write their totals"
  on public.user_mode_totals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read/write their hint totals"
  on public.user_hint_totals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
  
alter table public.profiles enable row level security;
create policy "Users can manage their profile"
  on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, avatar_url, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
