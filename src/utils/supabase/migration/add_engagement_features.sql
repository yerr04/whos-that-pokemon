-- Migration: Engagement features
-- Run AFTER add_game_stats.sql, add_difficulty_and_new_hints.sql,
-- add_leaderboards.sql and add_random_username.sql.
--
-- Adds:
--   1. Date-aware daily streaks with streak freezes (earn 1 per 7-day streak, hold up to 3)
--   2. Daily guess distribution for post-game social proof
--   3. Friend groups with invite codes + private leaderboards
--   4. Achievements
--   5. One-time guest stats merge for new sign-ups
--
-- Also hardens apply_game_result: the user is now derived from auth.uid()
-- instead of a client-supplied p_user_id, inputs are validated, and the old
-- insecure overloads are dropped.

-- ---------------------------------------------------------------------------
-- 0. Server-side mirror of the client's daily rollover (10:00 AM ET).
--    Must stay in sync with src/utils/dailyChallenge.ts getTodaysDateKey().
-- ---------------------------------------------------------------------------
create or replace function public.current_daily_date()
returns date
language sql
stable
as $$
  select case
    when (now() at time zone 'America/New_York')::time < time '10:00'
      then (now() at time zone 'America/New_York')::date - 1
    else (now() at time zone 'America/New_York')::date
  end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Streak freezes + date-aware streak columns
-- ---------------------------------------------------------------------------
alter table public.user_mode_totals
  add column if not exists streak_freezes int not null default 0,
  add column if not exists freezes_earned int not null default 0,
  add column if not exists last_daily_date date;

-- Backfill last_daily_date from each user's most recent daily session so
-- existing streaks keep working after this migration.
update public.user_mode_totals t
set last_daily_date = (
  select max(gs.daily_date)
  from public.game_sessions gs
  where gs.user_id = t.user_id and gs.mode = 'daily'
)
where t.mode = 'daily' and t.last_daily_date is null;

-- Speeds up the per-date distribution query below.
create index if not exists game_sessions_daily_date_idx
  on public.game_sessions (daily_date)
  where mode = 'daily';

-- Drop the old insecure overloads (they trusted a client-supplied user id).
drop function if exists public.apply_game_result(
  public.game_mode, uuid, boolean, int, int, text, text, text[], int);
drop function if exists public.apply_game_result(
  public.game_mode, uuid, boolean, int, int, text, text, text[], int, text);

-- Rewritten result recorder:
--   * user comes from auth.uid()
--   * daily streaks are date-aware: a win the day after your last daily play
--     extends the streak; missed days can be covered by streak freezes;
--     otherwise the streak restarts at 1. A loss always resets to 0.
--   * every 7th consecutive daily win earns a freeze (max 3 held)
--   * archive replays (daily_date <> today) record sessions and totals but
--     never touch the streak
--   * duplicate daily submissions are ignored entirely (no double counting)
create or replace function public.apply_game_result(
  p_mode public.game_mode,
  p_win boolean,
  p_guesses_made int,
  p_hints_revealed int,
  p_hint_type_on_win text,
  p_daily_date text,
  p_hint_sequence text[],
  p_pokemon_id int,
  p_difficulty text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.current_daily_date();
  daily_date_val date;
  v_counts_for_streak boolean := false;
  v_totals public.user_mode_totals%rowtype;
  v_new_streak int;
  v_freezes int;
  v_freezes_earned int;
  v_gap int;
  hint_item text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Sanity-check client-supplied values.
  if p_guesses_made is null or p_guesses_made < 1 or p_guesses_made > 10
     or p_hints_revealed is null or p_hints_revealed < 0 or p_hints_revealed > 10
     or coalesce(array_length(p_hint_sequence, 1), 0) > 12 then
    raise exception 'Invalid game result';
  end if;
  if p_difficulty is not null and p_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'Invalid difficulty';
  end if;

  if p_mode = 'daily' then
    if p_daily_date is null or p_daily_date = '' then
      raise exception 'Daily games require a date';
    end if;
    daily_date_val := p_daily_date::date;
    if daily_date_val > v_today then
      raise exception 'Daily date cannot be in the future';
    end if;
    v_counts_for_streak := daily_date_val = v_today;
  end if;

  insert into public.game_sessions (
    user_id, mode, win, guesses_made, hints_revealed,
    hint_type_on_win, hint_sequence, daily_date, pokemon_id, difficulty
  ) values (
    v_uid, p_mode, p_win, p_guesses_made, p_hints_revealed,
    p_hint_type_on_win, p_hint_sequence, daily_date_val, p_pokemon_id, p_difficulty
  )
  on conflict (user_id, daily_date) where mode = 'daily'
  do nothing;

  if not found then
    -- This daily date was already recorded; report state without recounting.
    select current_streak, streak_freezes
      into v_new_streak, v_freezes
      from public.user_mode_totals
      where user_id = v_uid and mode = p_mode;
    return jsonb_build_object(
      'counted', false,
      'current_streak', coalesce(v_new_streak, 0),
      'streak_freezes', coalesce(v_freezes, 0)
    );
  end if;

  -- Ensure a totals row exists, then lock it for this update.
  insert into public.user_mode_totals (user_id, mode)
  values (v_uid, p_mode)
  on conflict (user_id, mode) do nothing;

  select * into v_totals
    from public.user_mode_totals
    where user_id = v_uid and mode = p_mode
    for update;

  v_new_streak := v_totals.current_streak;
  v_freezes := v_totals.streak_freezes;
  v_freezes_earned := v_totals.freezes_earned;

  if p_mode = 'unlimited' then
    -- Unlimited streak = consecutive wins in that mode.
    v_new_streak := case when p_win then v_totals.current_streak + 1 else 0 end;
  elsif v_counts_for_streak then
    if not p_win then
      v_new_streak := 0;
    elsif v_totals.last_daily_date is null then
      v_new_streak := 1;
    else
      v_gap := v_today - v_totals.last_daily_date;
      if v_gap <= 1 then
        v_new_streak := v_totals.current_streak + 1;
      elsif (v_gap - 1) <= v_freezes then
        -- Missed day(s) covered by freezes.
        v_freezes := v_freezes - (v_gap - 1);
        v_new_streak := v_totals.current_streak + 1;
      else
        v_new_streak := 1;
      end if;
    end if;

    -- Earn a freeze on every 7th consecutive daily win, hold at most 3.
    if p_win and v_new_streak > 0 and v_new_streak % 7 = 0 and v_freezes < 3 then
      v_freezes := v_freezes + 1;
      v_freezes_earned := v_freezes_earned + 1;
    end if;
  end if;

  update public.user_mode_totals set
    total_games = v_totals.total_games + 1,
    total_wins = v_totals.total_wins + case when p_win then 1 else 0 end,
    win_rate = (v_totals.total_wins + case when p_win then 1 else 0 end)::decimal
               / (v_totals.total_games + 1),
    current_streak = v_new_streak,
    max_streak = greatest(v_totals.max_streak, v_new_streak),
    total_hints_used = v_totals.total_hints_used + p_hints_revealed,
    streak_freezes = v_freezes,
    freezes_earned = v_freezes_earned,
    last_daily_date = case
      when p_mode = 'daily' and v_counts_for_streak then v_today
      else v_totals.last_daily_date
    end,
    updated_at = now()
  where user_id = v_uid and mode = p_mode;

  if p_hint_sequence is not null then
    foreach hint_item in array p_hint_sequence
    loop
      insert into public.user_hint_totals (user_id, hint_type, wins_with_hint, total_uses)
      values (v_uid, hint_item, case when p_win then 1 else 0 end, 1)
      on conflict (user_id, hint_type)
      do update set
        wins_with_hint = user_hint_totals.wins_with_hint + case when p_win then 1 else 0 end,
        total_uses = user_hint_totals.total_uses + 1;
    end loop;
  end if;

  if p_win and p_hint_type_on_win is not null then
    insert into public.user_hint_totals (user_id, hint_type, wins_with_hint, total_uses)
    values (v_uid, p_hint_type_on_win, 1, 0)
    on conflict (user_id, hint_type)
    do update set wins_with_hint = user_hint_totals.wins_with_hint + 1;
  end if;

  return jsonb_build_object(
    'counted', true,
    'counts_for_streak', v_counts_for_streak,
    'current_streak', v_new_streak,
    'streak_freezes', v_freezes
  );
end;
$$;

revoke execute on function public.apply_game_result(
  public.game_mode, boolean, int, int, text, text, text[], int, text) from public, anon;
grant execute on function public.apply_game_result(
  public.game_mode, boolean, int, int, text, text, text[], int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Daily guess distribution (post-game social proof)
--    bucket = guesses_made for wins, 0 for losses. Aggregated counts only.
-- ---------------------------------------------------------------------------
create or replace function public.daily_guess_distribution(p_date date)
returns table (bucket int, players bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when gs.win then gs.guesses_made else 0 end as bucket,
    count(*)::bigint as players
  from public.game_sessions gs
  where gs.mode = 'daily' and gs.daily_date = p_date
  group by 1
  order by 1;
$$;

grant execute on function public.daily_guess_distribution(date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Friend groups
--    Tables are RLS-enabled with NO policies: all access goes through
--    SECURITY DEFINER functions keyed on auth.uid(), so clients can never
--    read or write rows directly.
-- ---------------------------------------------------------------------------
create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_group_members (
  group_id uuid not null references public.friend_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;

-- Invite codes: 6 chars from an unambiguous alphabet (no I/L/O/0/1).
create or replace function public.generate_group_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    select string_agg(substr(alphabet, (floor(random() * 31))::int + 1, 1), '')
      into code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.friend_groups g where g.code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_friend_group(p_name text)
returns table (group_id uuid, name text, code text, owner_id uuid, member_count bigint, is_owner boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_group public.friend_groups%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'Group name must be 1-30 characters';
  end if;
  if (select count(*) from public.friend_groups g where g.owner_id = v_uid) >= 5 then
    raise exception 'You can own at most 5 groups';
  end if;

  insert into public.friend_groups (name, code, owner_id)
  values (v_name, public.generate_group_code(), v_uid)
  returning * into v_group;

  insert into public.friend_group_members (group_id, user_id)
  values (v_group.id, v_uid);

  return query
  select v_group.id, v_group.name, v_group.code, v_group.owner_id, 1::bigint, true;
end;
$$;

create or replace function public.join_friend_group(p_code text)
returns table (group_id uuid, name text, code text, owner_id uuid, member_count bigint, is_owner boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.friend_groups%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
    from public.friend_groups g
    where g.code = upper(trim(coalesce(p_code, '')));
  if not found then
    raise exception 'No group found for that code';
  end if;

  if (select count(*) from public.friend_group_members m where m.group_id = v_group.id) >= 50 then
    raise exception 'This group is full (50 members max)';
  end if;
  if (select count(*) from public.friend_group_members m where m.user_id = v_uid) >= 10 then
    raise exception 'You can join at most 10 groups';
  end if;

  insert into public.friend_group_members (group_id, user_id)
  values (v_group.id, v_uid)
  on conflict do nothing;

  return query
  select
    v_group.id, v_group.name, v_group.code, v_group.owner_id,
    (select count(*) from public.friend_group_members m where m.group_id = v_group.id),
    v_group.owner_id = v_uid;
end;
$$;

create or replace function public.leave_friend_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_next_owner uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.friend_group_members m
  where m.group_id = p_group_id and m.user_id = v_uid;

  select g.owner_id into v_owner from public.friend_groups g where g.id = p_group_id;
  if v_owner = v_uid then
    -- Owner left: hand the group to the earliest remaining member,
    -- or delete it if empty.
    select m.user_id into v_next_owner
      from public.friend_group_members m
      where m.group_id = p_group_id
      order by m.joined_at
      limit 1;
    if v_next_owner is null then
      delete from public.friend_groups g where g.id = p_group_id;
    else
      update public.friend_groups g set owner_id = v_next_owner where g.id = p_group_id;
    end if;
  end if;
end;
$$;

create or replace function public.my_friend_groups()
returns table (group_id uuid, name text, code text, owner_id uuid, member_count bigint, is_owner boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.code,
    g.owner_id,
    (select count(*) from public.friend_group_members mm where mm.group_id = g.id),
    g.owner_id = auth.uid()
  from public.friend_groups g
  join public.friend_group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at;
$$;

-- Members ranked by current daily streak. Only exposes safe display fields,
-- and only to members of the group.
create or replace function public.friend_group_leaderboard(p_group_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  current_streak int,
  max_streak int,
  daily_wins int,
  total_games bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.friend_group_members m
    where m.group_id = p_group_id and m.user_id = v_uid
  ) then
    raise exception 'Not a member of this group';
  end if;

  return query
  select
    rank() over (
      order by coalesce(t.current_streak, 0) desc,
               coalesce(t.total_wins, 0) desc,
               m.joined_at asc
    ) as rank,
    m.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer') as display_name,
    p.avatar_url,
    coalesce(t.current_streak, 0) as current_streak,
    coalesce(t.max_streak, 0) as max_streak,
    coalesce(t.total_wins, 0) as daily_wins,
    coalesce((
      select sum(a.total_games)
      from public.user_mode_totals a
      where a.user_id = m.user_id
    ), 0)::bigint as total_games
  from public.friend_group_members m
  left join public.user_mode_totals t
    on t.user_id = m.user_id and t.mode = 'daily'
  left join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id
  order by 1;
end;
$$;

grant execute on function public.create_friend_group(text) to authenticated;
grant execute on function public.join_friend_group(text) to authenticated;
grant execute on function public.leave_friend_group(uuid) to authenticated;
grant execute on function public.my_friend_groups() to authenticated;
grant execute on function public.friend_group_leaderboard(uuid) to authenticated;
revoke execute on function public.create_friend_group(text) from public, anon;
revoke execute on function public.join_friend_group(text) from public, anon;
revoke execute on function public.leave_friend_group(uuid) from public, anon;
revoke execute on function public.my_friend_groups() from public, anon;
revoke execute on function public.friend_group_leaderboard(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- 4. Achievements
--    Definitions (ids, names, icons) live in src/data/achievements.ts; the
--    unlock CONDITIONS are evaluated here, server-side, from real data so
--    they can't be forged by the client. check_achievements() returns only
--    the ids that were newly unlocked by this call.
-- ---------------------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "Users can read their achievements" on public.user_achievements;
create policy "Users can read their achievements"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

create or replace function public.check_achievements()
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total_games bigint;
  v_total_wins bigint;
  v_daily_wins bigint;
  v_unlimited_wins bigint;
  v_daily_max_streak int;
  v_freezes_earned int;
  earned text[] := '{}';
begin
  if v_uid is null then
    return;
  end if;

  select coalesce(sum(total_games), 0), coalesce(sum(total_wins), 0)
    into v_total_games, v_total_wins
    from public.user_mode_totals where user_id = v_uid;
  select coalesce(sum(total_wins), 0), coalesce(max(max_streak), 0), coalesce(max(freezes_earned), 0)
    into v_daily_wins, v_daily_max_streak, v_freezes_earned
    from public.user_mode_totals where user_id = v_uid and mode = 'daily';
  select coalesce(sum(total_wins), 0)
    into v_unlimited_wins
    from public.user_mode_totals where user_id = v_uid and mode = 'unlimited';

  if v_total_wins >= 1 then earned := earned || 'first_win'; end if;
  if v_daily_max_streak >= 3 then earned := earned || 'streak_3'; end if;
  if v_daily_max_streak >= 7 then earned := earned || 'streak_7'; end if;
  if v_daily_max_streak >= 30 then earned := earned || 'streak_30'; end if;
  if v_total_games >= 50 then earned := earned || 'games_50'; end if;
  if v_total_games >= 100 then earned := earned || 'games_100'; end if;
  if v_total_games >= 500 then earned := earned || 'games_500'; end if;
  if v_daily_wins >= 25 then earned := earned || 'daily_25'; end if;
  if v_unlimited_wins >= 50 then earned := earned || 'unlimited_50'; end if;
  if v_freezes_earned >= 3 then earned := earned || 'freeze_collector'; end if;

  if exists (
    select 1 from public.game_sessions gs
    where gs.user_id = v_uid and gs.win and gs.guesses_made = 1
  ) then
    earned := earned || 'first_guess_win';
  end if;

  if exists (
    select 1 from public.game_sessions gs
    where gs.user_id = v_uid and gs.win and gs.difficulty = 'hard'
  ) then
    earned := earned || 'hard_win';
  end if;

  return query
  insert into public.user_achievements (user_id, achievement_id)
  select v_uid, a from unnest(earned) as a
  on conflict do nothing
  returning achievement_id;
end;
$$;

grant execute on function public.check_achievements() to authenticated;
revoke execute on function public.check_achievements() from public, anon;

-- ---------------------------------------------------------------------------
-- 5. Guest stats merge
--    A brand-new account (no totals rows at all) may import locally tracked
--    guest stats exactly once. Values are clamped to modest caps to bound
--    the effect of tampered localStorage on the public leaderboards.
-- ---------------------------------------------------------------------------
create or replace function public.merge_guest_stats(
  p_daily_games int,
  p_daily_wins int,
  p_streak int,
  p_max_streak int,
  p_last_win_date text,
  p_unlimited_games int,
  p_unlimited_wins int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.current_daily_date();
  v_daily_games int := least(greatest(coalesce(p_daily_games, 0), 0), 500);
  v_daily_wins int;
  v_streak int := least(greatest(coalesce(p_streak, 0), 0), 50);
  v_max_streak int;
  v_unl_games int := least(greatest(coalesce(p_unlimited_games, 0), 0), 500);
  v_unl_wins int;
  v_last_win date;
begin
  if v_uid is null then
    return false;
  end if;
  -- Only a fresh account may merge, and only once.
  if exists (select 1 from public.user_mode_totals t where t.user_id = v_uid) then
    return false;
  end if;

  v_daily_wins := least(greatest(coalesce(p_daily_wins, 0), 0), v_daily_games);
  v_unl_wins := least(greatest(coalesce(p_unlimited_wins, 0), 0), v_unl_games);
  v_max_streak := greatest(least(greatest(coalesce(p_max_streak, 0), 0), 50), v_streak);

  -- The claimed streak only stays alive if the last guest win was today or
  -- yesterday (relative to the daily rollover).
  begin
    v_last_win := nullif(p_last_win_date, '')::date;
  exception when others then
    v_last_win := null;
  end;
  if v_last_win is null or v_last_win < v_today - 1 or v_last_win > v_today then
    v_streak := 0;
  end if;

  if v_daily_games > 0 or v_streak > 0 or v_max_streak > 0 then
    insert into public.user_mode_totals (
      user_id, mode, total_games, total_wins, win_rate,
      current_streak, max_streak, last_daily_date, updated_at
    ) values (
      v_uid, 'daily', v_daily_games, v_daily_wins,
      case when v_daily_games > 0 then v_daily_wins::decimal / v_daily_games else 0 end,
      v_streak, v_max_streak,
      case when v_streak > 0 then v_last_win else null end,
      now()
    )
    on conflict (user_id, mode) do nothing;
  end if;

  if v_unl_games > 0 then
    insert into public.user_mode_totals (
      user_id, mode, total_games, total_wins, win_rate, updated_at
    ) values (
      v_uid, 'unlimited', v_unl_games, v_unl_wins,
      v_unl_wins::decimal / v_unl_games, now()
    )
    on conflict (user_id, mode) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.merge_guest_stats(int, int, int, int, text, int, int) to authenticated;
revoke execute on function public.merge_guest_stats(int, int, int, int, text, int, int) from public, anon;
