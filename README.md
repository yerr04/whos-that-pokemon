# PokéNerdle (Who's That Pokémon?)

A Pokémon guessing game: reveal hints with each wrong guess and try to name the Pokémon before you run out of tries. Play a shared daily challenge or unlimited random rounds.

## Features

- **Daily Challenge** (`/daily`) — One Pokémon per day (resets 10 AM ET). Same Pokémon and hint order for everyone; progress saved in the browser.
- **Unlimited Mode** (`/unlimited`) — Random Pokémon (IDs 1–1025); play as many rounds as you like.
- **Progressive hints** — Up to 6 hints (BST, region, ability, types, flavor text, move, evolution, height/weight, then cry and silhouette). Wrong guesses reveal the next hint; 7 guesses max.
- **Auth & stats** — Sign in with Supabase; track games, wins, streaks, and hint usage on your profile.

## Tech Stack

| Layer        | Tech |
|-------------|------|
| Framework   | Next.js 16 (App Router), React 19 |
| Language    | TypeScript 5 |
| Styling     | Tailwind CSS 4 |
| Backend     | Supabase (PostgreSQL + Auth) |
| External API| [PokeAPI](https://pokeapi.co/) (REST) |
| Fuzzy match | Fuse.js |

## Project Structure

```
src/
├── app/              # Pages: daily, unlimited, profile, auth
├── components/       # GameInterface, HintBlock, Navbar, Footer, etc.
├── hooks/            # useGameLogic, usePokemonGame, useDailyChallenge, useAuth, useUserStats
├── lib/              # PokeAPI client (pokeapi.ts)
├── types/            # TypeScript types (game.ts)
├── utils/            # pokemon, stats, dailyChallenge, supabase
└── middleware.ts     # Auth & routing
```

Game logic lives in custom hooks; `GameInterface` is a shared UI that receives game state as props.


## Documentation

- **[PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md)** — Architecture, hint system design, TypeScript usage, PokeAPI & Supabase integration, game and auth flows, and improvement ideas.

---

Inspired by Wordle. Pokémon data from [PokeAPI](https://pokeapi.co/); type icons and cries from [Pokémon Showdown](https://play.pokemonshowdown.com/).
