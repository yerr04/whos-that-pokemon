-- Profiles (optional, mirrors auth.users for display data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  avatar_url text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create enum type if it doesn't exist
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'game_mode') then
    create type public.game_mode as enum ('daily', 'unlimited');
  end if;
end $$;

-- Raw game sessions (one row per finished game)
create table if not exists public.game_sessions (
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
create table if not exists public.user_mode_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.game_mode not null,
  total_games int not null default 0,
  total_wins int not null default 0,
  win_rate decimal(5,4) not null default 0,
  current_streak int not null default 0,
  max_streak int not null default 0,
  total_hints_used int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

-- Hint performance aggregates
create table if not exists public.user_hint_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  hint_type text not null,
  wins_with_hint int not null default 0,
  total_uses int not null default 0,
  primary key (user_id, hint_type)
);

-- Function to apply one finished game to aggregates
create or replace function public.apply_game_result(
  p_mode public.game_mode,
  p_user_id uuid,
  p_win boolean,
  p_guesses_made int,
  p_hints_revealed int,
  p_hint_type_on_win text,
  p_daily_date text,
  p_hint_sequence text[],
  p_pokemon_id int
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

  -- Insert game session
  insert into public.game_sessions (
    user_id, mode, win, guesses_made, hints_revealed,
    hint_type_on_win, hint_sequence, daily_date, pokemon_id
  ) values (
    p_user_id, 
    p_mode, 
    p_win, 
    p_guesses_made, 
    p_hints_revealed,
    p_hint_type_on_win, 
    p_hint_sequence,
    daily_date_val, 
    p_pokemon_id
  )
  on conflict (user_id, daily_date) 
  where mode = 'daily'
  do nothing;

  -- Update mode totals
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

  -- Update hint totals
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

-- RLS policies
alter table public.game_sessions enable row level security;
alter table public.user_mode_totals enable row level security;
alter table public.user_hint_totals enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can manage their sessions" on public.game_sessions;
create policy "Users can manage their sessions"
  on public.game_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read/write their totals" on public.user_mode_totals;
create policy "Users can read/write their totals"
  on public.user_mode_totals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read/write their hint totals" on public.user_hint_totals;
create policy "Users can read/write their hint totals"
  on public.user_hint_totals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their profile" on public.profiles;
create policy "Users can manage their profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger 
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, avatar_url, full_name, created_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'full_name',
    now()
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill existing users (run separately if needed)
insert into public.profiles (id, email, avatar_url, full_name, created_at)
select 
  id,
  email,
  raw_user_meta_data->>'avatar_url',
  raw_user_meta_data->>'full_name',
  created_at
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
