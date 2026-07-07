-- Migration: Public leaderboards
-- Run AFTER add_game_stats.sql and add_difficulty_and_new_hints.sql
--
-- The existing RLS policies restrict every table to the owning user
-- (auth.uid() = user_id), so clients cannot read other players' rows.
-- Leaderboards therefore go through SECURITY DEFINER functions that run with
-- the function owner's privileges and expose ONLY safe, aggregated fields
-- (display name, avatar, score, rank). No emails or raw rows are exposed.

-- 1. Top players by fewest hints used on completed (won) daily challenges.
--    Score = average hints per winning daily game (lower is better).
--    Tiebreaker: more daily wins ranks higher.
create or replace function public.leaderboard_least_hints(p_limit int default 10)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  games_played bigint
)
language sql
security definer
set search_path = public
as $$
  with agg as (
    select
      gs.user_id,
      round(avg(gs.hints_revealed)::numeric, 2) as avg_hints,
      count(*) as wins
    from public.game_sessions gs
    where gs.mode = 'daily' and gs.win = true
    group by gs.user_id
  )
  select
    rank() over (order by a.avg_hints asc, a.wins desc) as rank,
    a.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer') as display_name,
    p.avatar_url,
    a.avg_hints as score,
    a.wins as games_played
  from agg a
  left join public.profiles p on p.id = a.user_id
  order by a.avg_hints asc, a.wins desc
  limit p_limit;
$$;

-- 2. Top players by longest daily streak ever achieved.
--    Score = max daily streak.
create or replace function public.leaderboard_longest_streak(p_limit int default 10)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  games_played bigint
)
language sql
security definer
set search_path = public
as $$
  select
    rank() over (order by t.max_streak desc, t.total_games desc) as rank,
    t.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer') as display_name,
    p.avatar_url,
    t.max_streak::numeric as score,
    t.total_games::bigint as games_played
  from public.user_mode_totals t
  left join public.profiles p on p.id = t.user_id
  where t.mode = 'daily' and t.max_streak > 0
  order by t.max_streak desc, t.total_games desc
  limit p_limit;
$$;

-- 3. Top players by most completed games overall (all modes combined).
--    Score = total games finished.
create or replace function public.leaderboard_most_games(p_limit int default 10)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  games_played bigint
)
language sql
security definer
set search_path = public
as $$
  with agg as (
    select user_id, sum(total_games) as total
    from public.user_mode_totals
    group by user_id
  )
  select
    rank() over (order by a.total desc) as rank,
    a.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer') as display_name,
    p.avatar_url,
    a.total::numeric as score,
    a.total::bigint as games_played
  from agg a
  left join public.profiles p on p.id = a.user_id
  where a.total > 0
  order by a.total desc
  limit p_limit;
$$;

-- 4. The calling user's own rank on a given board, even when outside the top N.
--    Returns 0 or 1 rows. Uses auth.uid(), so it only ever exposes the caller's
--    own placement. p_board is one of: 'least_hints', 'longest_streak', 'most_games'.
create or replace function public.leaderboard_my_rank(p_board text)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  games_played bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  if p_board = 'least_hints' then
    return query
    with agg as (
      select
        gs.user_id as uid,
        round(avg(gs.hints_revealed)::numeric, 2) as avg_hints,
        count(*) as wins
      from public.game_sessions gs
      where gs.mode = 'daily' and gs.win = true
      group by gs.user_id
    ),
    ranked as (
      select
        a.uid,
        rank() over (order by a.avg_hints asc, a.wins desc) as rnk,
        a.avg_hints as score,
        a.wins as games
      from agg a
    )
    select
      r.rnk,
      r.uid,
      coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer'),
      p.avatar_url,
      r.score,
      r.games
    from ranked r
    left join public.profiles p on p.id = r.uid
    where r.uid = v_uid;

  elsif p_board = 'longest_streak' then
    return query
    with ranked as (
      select
        t.user_id as uid,
        rank() over (order by t.max_streak desc, t.total_games desc) as rnk,
        t.max_streak::numeric as score,
        t.total_games::bigint as games
      from public.user_mode_totals t
      where t.mode = 'daily' and t.max_streak > 0
    )
    select
      r.rnk,
      r.uid,
      coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer'),
      p.avatar_url,
      r.score,
      r.games
    from ranked r
    left join public.profiles p on p.id = r.uid
    where r.uid = v_uid;

  elsif p_board = 'most_games' then
    return query
    with agg as (
      select umt.user_id as uid, sum(umt.total_games) as total
      from public.user_mode_totals umt
      group by umt.user_id
    ),
    ranked as (
      select
        a.uid,
        rank() over (order by a.total desc) as rnk,
        a.total::numeric as score,
        a.total::bigint as games
      from agg a
      where a.total > 0
    )
    select
      r.rnk,
      r.uid,
      coalesce(nullif(trim(p.full_name), ''), 'Anonymous Trainer'),
      p.avatar_url,
      r.score,
      r.games
    from ranked r
    left join public.profiles p on p.id = r.uid
    where r.uid = v_uid;
  end if;
end;
$$;

-- Allow both signed-in and anonymous visitors to read the leaderboards.
grant execute on function public.leaderboard_least_hints(int) to anon, authenticated;
grant execute on function public.leaderboard_longest_streak(int) to anon, authenticated;
grant execute on function public.leaderboard_most_games(int) to anon, authenticated;
-- Only signed-in users have a personal rank to look up.
grant execute on function public.leaderboard_my_rank(text) to authenticated;
