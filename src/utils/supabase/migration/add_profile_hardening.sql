-- Migration: Profile field hardening
-- Run AFTER add_engagement_features.sql.
--
-- profiles.full_name and profiles.avatar_url are written by clients and shown
-- publicly on leaderboards. The UI limits them, but anything with the anon key
-- can write to the table directly, so enforce the limits in the database:
--   * full_name: at most 40 characters (UI allows 24; headroom for legacy rows)
--   * avatar_url: null, or one of the two hosts the app actually serves
--     (Pokémon Showdown trainer sprites, Google account photos). Anything
--     else would break leaderboard rendering (next/image allowlist) anyway.

-- Normalize existing rows so the constraints can be added.
update public.profiles
set full_name = left(full_name, 40)
where full_name is not null and char_length(full_name) > 40;

update public.profiles
set avatar_url = null
where avatar_url is not null
  and avatar_url not like 'https://play.pokemonshowdown.com/sprites/trainers/%'
  and avatar_url not like 'https://lh3.googleusercontent.com/%';

alter table public.profiles
  drop constraint if exists profiles_full_name_length;
alter table public.profiles
  add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) <= 40);

alter table public.profiles
  drop constraint if exists profiles_avatar_url_allowed;
alter table public.profiles
  add constraint profiles_avatar_url_allowed
  check (
    avatar_url is null
    or avatar_url like 'https://play.pokemonshowdown.com/sprites/trainers/%'
    or avatar_url like 'https://lh3.googleusercontent.com/%'
  );

-- OPTIONAL data minimization: nothing reads profiles.email (leaderboards
-- exclude it; the profile page shows the session's email), so the copy in
-- this table is pure PII surface. Uncomment to drop it — handle_new_user
-- must stop inserting it first:
--
-- create or replace function public.handle_new_user()
-- returns trigger
-- language plpgsql
-- security definer
-- as $$
-- begin
--   insert into public.profiles (id, avatar_url, full_name, created_at)
--   values (
--     new.id,
--     new.raw_user_meta_data->>'avatar_url',
--     public.generate_random_username(),
--     now()
--   )
--   on conflict (id) do nothing;
--   return new;
-- end;
-- $$;
--
-- alter table public.profiles drop column if exists email;
