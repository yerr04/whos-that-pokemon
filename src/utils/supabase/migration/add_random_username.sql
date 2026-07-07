-- Migration: Privacy-friendly randomized usernames
-- Run AFTER add_game_stats.sql.
--
-- New Google sign-ins should NOT have their legal name stored on their profile.
-- Instead we generate a random handle in the format:
--   <Adjective><Pokemon><Number>  e.g. "SwiftCharizard4821"
-- stored in public.profiles.full_name. Users can change it later in their profile.
--
-- Note: Google still provides the legal name in auth.users.raw_user_meta_data and
-- Supabase re-merges it on every login, so we treat public.profiles.full_name as the
-- single source of truth for display and never surface the auth metadata name.

-- 1. Random username generator.
create or replace function public.generate_random_username()
returns text
language plpgsql
as $$
declare
  adjectives text[] := array[
    'Swift','Brave','Mighty','Sneaky','Cosmic','Fierce','Lucky','Shiny','Bold','Clever',
    'Wild','Sly','Epic','Mystic','Rapid','Silent','Stormy','Sunny','Frosty','Blazing',
    'Electric','Hyper','Mega','Turbo','Ancient','Crimson','Golden','Shadow','Radiant','Noble',
    'Feral','Zappy','Bouncy','Dizzy','Gentle','Jolly','Snappy','Wandering','Daring','Cheeky'
  ];
  mons text[] := array[
    'Pikachu','Charizard','Bulbasaur','Squirtle','Eevee','Snorlax','Gengar','Mewtwo','Lucario','Garchomp',
    'Gyarados','Lapras','Dragonite','Umbreon','Espeon','Sylveon','Greninja','Lugia','Rayquaza','Tyranitar',
    'Blaziken','Gardevoir','Metagross','Salamence','Absol','Zoroark','Mimikyu','Togepi','Magikarp','Ditto',
    'Jigglypuff','Machamp','Alakazam','Scyther','Arcanine','Vaporeon','Jolteon','Flareon','Onix','Cubone',
    'Bellsprout','Psyduck','Slowpoke','Cyndaquil','Totodile','Chikorita','Torchic','Mudkip','Treecko','Piplup'
  ];
  adj text;
  mon text;
  num int;
begin
  adj := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
  mon := mons[1 + floor(random() * array_length(mons, 1))::int];
  num := floor(random() * 9000 + 1000)::int;  -- 1000-9999
  return adj || mon || num::text;
end;
$$;

-- 2. Replace the new-user trigger so the profile is seeded with a random handle
--    instead of the Google legal name.
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
    public.generate_random_username(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 3. OPTIONAL backfill for existing users whose profile name is still their
--    legal name (i.e. they never customized it). This only touches rows where
--    profiles.full_name exactly matches the Google-provided name, so any handle a
--    user has already personalized is left untouched.
update public.profiles p
set full_name = public.generate_random_username(),
    updated_at = now()
from auth.users u
where p.id = u.id
  and p.full_name is not null
  and p.full_name = u.raw_user_meta_data->>'full_name';
