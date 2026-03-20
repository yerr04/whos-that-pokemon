# Project Walkthrough: Who's That Pokemon?

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Hint System Design & Execution](#hint-system-design--execution)
3. [Difficulty System](#difficulty-system)
4. [Alternate Forms & Expanded Pokemon Pool](#alternate-forms--expanded-pokemon-pool)
5. [TypeScript Usage](#typescript-usage)
6. [API Integrations](#api-integrations)
7. [Game Flow](#game-flow)
8. [Areas for Improvement](#areas-for-improvement)

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **External API**: PokeAPI (REST)
- **State Management**: React Hooks (custom hooks pattern)
- **Fuzzy Matching**: Fuse.js for guess validation
- **Animations**: Framer Motion for hint reveals and UI interactions

### Project Structure
```
src/
├── app/              # Next.js pages (daily, unlimited, profile, auth)
├── components/       # React components (GameInterface, HintBlock, PokemonAutocomplete, etc.)
├── data/            # Static data (pokemonCategories.ts — ID sets, form ranges, helpers)
├── hooks/           # Custom React hooks (game logic, auth, stats, pokemon list)
├── lib/             # External API client (pokeapi.ts)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (pokemon, stats, dailyChallenge)
│   └── supabase/    # Supabase client setup and SQL migrations
└── middleware.ts    # Next.js middleware for auth & routing
```

### Design Patterns
- **Custom Hooks Pattern**: Game logic separated into reusable hooks
  - `useGameLogic`: Core game mechanics (data loading, guess handling, state)
  - `usePokemonGame`: Unlimited mode wrapper (difficulty, hint sequence, weighted selection)
  - `useDailyChallenge`: Daily mode with persistence and seeded difficulty
  - `usePokemonList`: Pokemon name list with Fuse.js autocomplete
  - `useAuth`: Authentication state
  - `useUserStats`: Statistics fetching

- **Component Composition**: `GameInterface` is a reusable component that accepts game state as props, rendering difficulty selectors, hints, and autocomplete input

- **Static Data Module**: `src/data/pokemonCategories.ts` contains all hardcoded ID sets (starters, fossils, ultra beasts, etc.) and form ID ranges, keeping API calls to a minimum

---

## Hint System Design & Execution

### Hint Types
The game defines **15 hint types** in `src/types/game.ts`, organized into three tiers plus fixed finals:

**Tier 1 (Easy)** — broad categories most players know:
- `types`: Type icons (Fire, Water, etc.)
- `region`: Generation/Region (Kanto, Johto, etc.)
- `specialStatus`: Legendary / Mythical / Baby / Starter / Fossil / Ultra Beast / Paradox / Pseudo-Legendary / None
- `evolution`: Evolution stage (First Stage / Middle Stage / Final Stage / No Evolution)

**Tier 2 (Medium)** — requires specific knowledge or reading:
- `ability`: Primary ability name
- `move`: Random learnable move
- `pokedex`: Flavor text with Pokemon name redacted
- `evolutionMethod`: How the Pokemon was reached (Trade / Item / Friendship / Level-Up / N/A)
- `splitEvolution`: Whether the evolution line branches (Split / Linear / No Evolution Line)
- `specialForms`: What alternate forms exist (Has Mega Evolution / Has Gigantamax / Has Regional Variant / Is Mega Evolution / Is Alolan Form / etc.)

**Tier 3 (Hard)** — niche numeric knowledge:
- `bst`: Base Stat Total
- `height`: Height in meters/feet
- `weight`: Weight in kg/lbs

**Fixed Final** (always the last 2 hints, all difficulties):
- `cry`: Audio cry
- `silhouette`: Visual silhouette

### Hint Sequence Generation

**Location**: `src/utils/pokemon.ts` → `generateHintSequence(difficulty, customRandom?)`

**Algorithm**:
1. Reads the `DIFFICULTY_CONFIG` for the given difficulty to get `allowedTiers` and `hintCount`
2. Builds a pool by concatenating hints from the allowed tiers (e.g., Easy = Tier 1 + Tier 2 = 10 hints)
3. Shuffles the pool using Fisher-Yates with the provided RNG (or `Math.random`)
4. Takes the first `hintCount` shuffled hints
5. Appends `cry` and `silhouette` as fixed final hints
6. Returns the sequence

**Deterministic for Daily Mode**:
- Uses seeded RNG based on `dateKey:pokemonId`
- Same date = same hint sequence for all players
- Implemented via `createSeededRandom()` using 32-bit LCG

**Random for Unlimited Mode**:
- Uses `Math.random()` for true randomness
- Each game gets a different sequence

### Hint Revelation Logic

**Location**: `src/hooks/usePokemonGame.ts` and `src/hooks/useDailyChallenge.ts`

**Revelation Strategy**:
```typescript
revealedHints =
  debugMode ? hintSequence                    // Show all in dev
  : win ? hintSequence                         // Show all on win
  : hintSequence.slice(0, guessesMade)         // Progressive reveal
```

**Execution Flow**:
1. Player makes guess -> `guessesMade` increments
2. `revealedHints` calculated as slice of `hintSequence[0..guessesMade]`
3. `GameInterface` maps over `revealedHints` and renders `HintBlock` components
4. Each `HintBlock` switches on hint type and displays formatted data

### Hint Data Extraction

**Location**: `src/hooks/useGameLogic.ts` → `loadPokemonData()`

**Process**:
1. Fetches Pokemon data via `getPokemon(id)` (works for both base IDs 1-1025 and form IDs 10033+)
2. Extracts species ID from `pokemon.species.url` via `extractSpeciesId()` (critical for form Pokemon where the species ID differs from the pokemon ID)
3. Fetches species data via `getSpecies(speciesId)` (generation, evolution chain, flavor text, is_legendary/is_mythical/is_baby)
4. Fetches evolution chain if available (recursive `EvolutionChainNode` with `evolution_details`)
5. For Mega forms, fetches the base Pokemon's move pool since Megas share their base species' learnable moves
6. Uses a stale-load guard (`latestLoadIdRef`) to discard results from superseded loads
7. Transforms raw API data into `ParsedPokemonInfo`:
   - `bst`: Sum of all base stats
   - `region`: Maps generation name -> region name
   - `ability`: First ability from abilities array
   - `types`: Sorted by slot, extracted type names
   - `pokedexEntry`: English flavor text with Pokemon name redacted (uses base species name)
   - `move`: Random move from moveset (uses seeded RNG for daily; uses base species moves for Megas)
   - `evolutionStage`: Traverses evolution chain to determine stage (uses base species name for forms)
   - `evolutionMethod`: Walks chain to find the trigger for how this Pokemon was reached (Trade/Item/Friendship/Level-Up/N/A)
   - `hasSplitEvolution`: Recursively checks if any chain node has `evolves_to.length > 1`
   - `specialStatus`: Checks API flags (legendary/mythical/baby) then static ID sets (starter/fossil/UB/paradox/pseudo-legendary), using the base species ID for form Pokemon
   - `specialForms`: Checks static sets for mega/gigantamax/regional form availability, or reports what kind of form the target is
   - `height/weight`: Raw values from the form's own data (formatted in `HintBlock`)
   - `cryUrl`: Constructed URL to Showdown audio
   - `silhouetteUrl`: Official artwork sprite URL

### Hint Display

**Location**: `src/components/HintBlock.tsx`

**Rendering**:
- Each hint type has a switch case with Framer Motion stagger animations
- Common styling via `commonCls` (cyan border, rounded pill)
- Special rendering:
  - `types`: Renders type icons from Showdown sprites
  - `pokedex`: Wraps in smart quotes
  - `specialStatus`: Displays the Pokemon's classification (Legendary, Starter, etc.)
  - `evolutionMethod`: Shows how the Pokemon evolves (Trade, Item, Friendship, etc.)
  - `splitEvolution`: Shows whether the evolution line branches
  - `specialForms`: Lists available forms or identifies what form the target is
  - `cry`: Renders HTML5 `<audio>` controls
  - `silhouette`: Overlays on base image with `brightness(0%)` filter (revealed on win)

---

## Difficulty System

### Configuration

**Location**: `src/types/game.ts` → `DIFFICULTY_CONFIG`

| Difficulty | Max Guesses | Hints Drawn | Allowed Tiers | Total Hints |
|---|---|---|---|---|
| Easy | 7 | 4 | Tier 1 + Tier 2 | 4 + cry + silhouette = 6 |
| Medium | 6 | 3 | Tier 1 + Tier 2 + Tier 3 | 3 + cry + silhouette = 5 |
| Hard | 5 | 2 | Tier 2 + Tier 3 (no Tier 1) | 2 + cry + silhouette = 4 |

Hard mode excludes Tier 1 hints entirely, so players never get the easiest categories like type or region.

### Unlimited Mode

**Location**: `src/hooks/usePokemonGame.ts`

- Default difficulty: `medium`
- Players see three pill buttons (Easy / Medium / Hard) above the game area
- Selecting a difficulty calls `changeDifficulty()`, which updates state and loads a new Pokemon with the appropriate hint sequence and guess count
- The guess progress bar dynamically adjusts its length based on `maxGuesses`

### Daily Mode

**Location**: `src/hooks/useDailyChallenge.ts`

- Difficulty is deterministic from the date: `createSeededRandom("difficulty:" + dateKey)` produces the same difficulty for all players
- A colored badge shows "Today's Difficulty: Easy/Medium/Hard" (green/yellow/red)
- No selector — the difficulty is fixed for the day
- Old localStorage saves without a `difficulty` field are backfilled with `'medium'`

---

## Alternate Forms & Expanded Pokemon Pool

### Form ID Ranges

**Location**: `src/data/pokemonCategories.ts`

The game includes alternate forms with genuine gameplay differences (different types, stats, abilities) as guessable targets. All use the standard `/api/v2/pokemon/{id}` endpoint:

| Category | ID Range | Count |
|---|---|---|
| Mega Evolutions | 10033-10090 | ~58 |
| Alolan Forms | 10091-10115 | ~25 |
| Zygarde Forms | 10118-10120 | 3 |
| Galarian Forms | 10161-10180 | ~20 |
| Hisuian Forms | 10229-10244 | ~16 |
| Paldean Wooper | 10253 | 1 |
| Additional Megas | 10278-10325 | ~48 |

Total pool: ~1025 base + ~171 forms = ~1196 Pokemon.

### Weighted Selection

Forms appear ~8% of the time via `selectRandomPokemon(rng)`:
- 92% chance: random base Pokemon ID (1-1025)
- 8% chance: random form ID from `ALL_FORM_IDS`
- Both unlimited and daily modes use this (daily via seeded RNG)

### Display Names

Form Pokemon use suffix format via `formatFormDisplayName()`:
- `venusaur-mega` -> "Venusaur (Mega)"
- `charizard-mega-x` -> "Charizard (Mega X)"
- `vulpix-alola` -> "Vulpix (Alolan)"
- `ponyta-galar` -> "Ponyta (Galarian)"

### Species Lookup for Forms

Form Pokemon share a species with their base form (e.g., Mega Venusaur's species is Venusaur, species ID 3). The `Pokemon` interface includes a `species.url` field, and `extractSpeciesId()` parses the base species ID from it. This is critical — calling `getSpecies(10033)` would fail, but `getSpecies(3)` works correctly and returns the right `is_legendary`, evolution chain, and flavor text.

### Guess Matching

`isCloseMatch()` in `src/utils/pokemon.ts` uses a two-step approach:
1. **Normalized exact match**: Strips hyphens, spaces, and parentheses, lowercases, then compares — so "venusaur mega", "venusaur-mega", and "Venusaur (Mega)" all match
2. **Fuse.js fuzzy match**: Falls back to fuzzy matching with `threshold: 0.25` for misspellings

Both `useGameLogic.handleGuess()` and `useDailyChallenge.handleGuess()` check against both the API name (`venusaur-mega`) and the display name (`Venusaur (Mega)`).

### Autocomplete

**Location**: `src/hooks/usePokemonList.ts`

- Fetches `?limit=1500` from PokeAPI to include form entries
- Filters to `VALID_IDS` (base 1-1025 + all form IDs)
- Each entry has both `name` (API name) and `displayName` (formatted suffix)
- Fuse.js searches both fields, so "mega charizard" and "alolan vulpix" both work
- localStorage cache key is `pokemon-name-list-v2` (bumped to bust old caches)

### Static Data

**Location**: `src/data/pokemonCategories.ts`

Exports:
- **Special status ID sets** (for hint categories): `STARTER_IDS`, `FOSSIL_IDS`, `ULTRA_BEAST_IDS`, `PARADOX_IDS`, `PSEUDO_LEGENDARY_IDS`, `GIGANTAMAX_IDS`
- **Form-related sets** (for "Has X" hints on base Pokemon): `HAS_MEGA_IDS`, `HAS_REGIONAL_FORM_IDS`
- **Form ID ranges**: `MEGA_FORM_IDS`, `ALOLAN_FORM_IDS`, `GALARIAN_FORM_IDS`, `HISUIAN_FORM_IDS`, `PALDEAN_FORM_IDS`, `ZYGARDE_FORM_IDS`
- **Combined**: `ALL_FORM_IDS`, `VALID_POKEMON_IDS`
- **Helpers**: `isFormPokemon()`, `getFormCategory()`, `formatFormDisplayName()`, `getSpecialStatus()`, `getSpecialForms()`, `selectRandomPokemon()`, `extractSpeciesId()`

---

## TypeScript Usage

### Type Safety

**Strong Typing Throughout**:
- API responses: `Pokemon`, `Species`, `EvolutionChain`, `EvolutionChainNode`, `EvolutionDetail` interfaces
- Game state: `ParsedPokemonInfo`, `HintType`, `Difficulty`, `DifficultyConfig`, `DailyGameState`
- Function parameters: Explicit types for all functions
- Props: All components have typed props interfaces

**Key Type Definitions** (`src/types/game.ts`):
```typescript
export type HintType = 'bst' | 'region' | 'ability' | 'types' | ... | 'specialStatus' | 'evolutionMethod' | 'splitEvolution' | 'specialForms'
export type Difficulty = 'easy' | 'medium' | 'hard'
export interface ParsedPokemonInfo { ... }
export const HINT_TIERS: Record<HintType, 1 | 2 | 3 | 'fixed'>
export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig>
```

### Type Utilities

**Union Types**: `HintType` uses union for exhaustive checking in `HintBlock` switch
**Record Types**: `HINT_TIERS`, `DIFFICULTY_CONFIG`, `DIFFICULTY_COLORS` use `Record<K, V>` for compile-time completeness
**Generic Functions**: Cache system uses `<T>` for type safety
**Recursive Types**: `EvolutionChainNode` is self-referencing via `evolves_to: EvolutionChainNode[]`

### TypeScript Patterns

1. **Optional Parameters**: `speciesName?: string` in evolution functions handles both base and form Pokemon
2. **Type Guards**: `isFormPokemon()` determines code path for form-specific logic
3. **Optional Chaining**: Used extensively for API data (`pokemon.abilities[0]?.ability.name`)
4. **Proper Typing**: `ParsedPokemonInfo` is fully typed — no `as any` casts

---

## API Integrations

### PokeAPI Integration

**Location**: `src/lib/pokeapi.ts`

**Features**:
- **Caching**: LRU cache with stale-while-revalidate
  - Fresh window: 30 minutes
  - Stale window: 1 hour
  - Max entries: 150
- **Deduplication**: `inFlight` Map prevents duplicate concurrent requests
- **Error Handling**: Classifies HTTP errors with status codes

**Endpoints Used**:
1. `GET /api/v2/pokemon/{id}` — Main Pokemon data (works for both base IDs 1-1025 and form IDs 10033+)
2. `GET /api/v2/pokemon-species/{id}` — Species metadata (via species URL from pokemon response)
3. Evolution chain URL — Evolution chain with `evolution_details` (triggers, items, happiness)

**Data Flow**:
```
loadPokemonData(pokemonId)
  → getPokemon(pokemonId)                    [cached]
  → extractSpeciesId(pokemon.species.url)    [local parse]
  → getSpecies(speciesId)                    [cached]
  → getEvolutionChain(url)                   [cached]
  → (if Mega) getPokemon(baseSpeciesId)      [cached, for move pool]
  → Transform to ParsedPokemonInfo
```

### Supabase Integration

**Location**: `src/utils/supabase/client.ts` and `server.ts`

**Features**:
- **SSR Support**: Uses `@supabase/ssr` for cookie-based auth
- **Client/Server Separation**: Different clients for browser vs server
- **Session Management**: Middleware refreshes sessions automatically

**Database Schema**:

Migrations in `src/utils/supabase/migration/`:
- `add_game_stats.sql` — Initial schema
- `add_difficulty_and_new_hints.sql` — Adds difficulty column and updates RPC

1. **`game_sessions`**: Raw game results
   - One row per completed game
   - Stores: mode, pokemon_id, guesses, hints, win status, hint_sequence, difficulty
   - Unique constraint on `(user_id, daily_date)` for daily mode

2. **`user_mode_totals`**: Aggregated stats per mode
   - Total games, wins, win rate, streaks, hints used
   - Updated via `apply_game_result()` RPC

3. **`user_hint_totals`**: Hint performance analytics
   - Wins with each hint type, total uses
   - Tracks which hints are most effective (includes new hint types like specialStatus, evolutionMethod, etc.)

4. **`profiles`**: User display data
   - Mirrors auth.users with additional fields
   - Auto-created via trigger on signup

**RPC Function**: `apply_game_result()`
- Accepts 10 parameters including `p_difficulty text default null`
- Inserts game session (with difficulty)
- Updates mode totals (upsert)
- Updates hint totals (upsert per hint in sequence)
- Handles daily mode uniqueness constraint

### External Resources

**Pokemon Showdown**:
- Type icons: `https://play.pokemonshowdown.com/sprites/types/{Type}.png`
- Cries: `https://play.pokemonshowdown.com/audio/cries/{name}.mp3`

**PokeAPI Sprites** (for autocomplete thumbnails):
- `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

---

## Game Flow

### Unlimited Mode Flow

```
1. User visits /unlimited
   |
2. usePokemonGame() hook initializes (default difficulty: medium)
   |
3. loadNewPokemon(difficulty) called:
   - Generates hint sequence via generateHintSequence(difficulty)
   - Selects Pokemon via selectRandomPokemon() (~92% base, ~8% forms)
   - Calls gameLogic.loadPokemonData(id, { maxGuesses })
   |
4. loadPokemonData():
   - Fetches Pokemon, Species, EvolutionChain (cached)
   - Extracts speciesId from pokemon.species.url (for form Pokemon)
   - For Megas, fetches base Pokemon move pool
   - Guards against stale loads via latestLoadIdRef
   - Transforms to ParsedPokemonInfo (15 fields)
   |
5. GameInterface renders:
   - Difficulty selector (Easy / Medium / Hard pill buttons)
   - Silhouette overlay (if revealed or won)
   - Revealed hints via HintBlock (based on guessesMade)
   - PokemonAutocomplete input with fuzzy search
   - Dynamic guess progress bar (length = maxGuesses)
   |
6. User submits guess:
   - handleGuess() increments guessesMade
   - Checks isCloseMatch() against both API name and display name
   - Normalized comparison then Fuse.js fuzzy fallback
   - If correct -> sets win = true
   |
7. On completion:
   - recordGameResult() called with difficulty
   - Inserts into Supabase via RPC (apply_game_result)
   - Updates aggregates
   |
8. User clicks "NEXT POKEMON" -> Back to step 3
   |
9. User changes difficulty -> changeDifficulty() -> Back to step 3
```

### Daily Mode Flow

```
1. User visits /daily
   |
2. useDailyChallenge() hook initializes
   |
3. loadDailyChallenge() called:
   - Gets today's dateKey (10 AM ET rollover)
   - Derives deterministic difficulty via getDailyDifficulty(dateKey)
   - Picks deterministic Pokemon via getDailyPokemonId(dateKey) (seeded weighted selection)
   - Generates deterministic hint sequence via generateHintSequence(difficulty, seededRandom)
   - Checks localStorage for saved game state
   |
4. If saved state exists and dateKey matches:
   - Restores guesses, win status, etc.
   - Backfills difficulty field if missing (for pre-redesign saves)
   |
5. If new day or no saved state:
   - Creates new game state (with difficulty)
   - Loads Pokemon data (with seeded RNG for move selection)
   |
6. GameInterface renders:
   - Difficulty badge: "Today's Difficulty: Easy/Medium/Hard" (not interactive)
   - Game play same as unlimited mode
   |
7. On each guess:
   - Checks against both API name and display name
   - Updates game state and saves to localStorage
   |
8. On completion:
   - Records to Supabase (with dailyDateKey and difficulty)
   - Shows countdown to next challenge
   |
9. Timer checks every second:
   - Updates countdown
   - Detects date change -> resets game
```

### Authentication Flow

```
1. User visits protected route (/profile)
   |
2. middleware.ts -> proxy() checks for Supabase session cookie
   |
3. If no session -> redirects to /auth/sign-in
   |
4. User signs in -> redirects to /auth/callback
   |
5. Callback route exchanges code for session
   |
6. Sets cookies -> redirects to original route
   |
7. Middleware refreshes session on each request
```

---

## Areas for Improvement

### 1. Error Handling

**Issues**:
- API errors only logged to console
- No user-friendly error messages for network failures
- No retry logic for failed API calls

**Recommendations**:
- Add error boundaries for React components
- Implement retry logic with exponential backoff
- Show user-friendly error messages with retry buttons
- Add fallback UI for API failures

### 2. Performance

**Issues**:
- No code splitting for game modes
- No memoization of expensive computations
- Form Pokemon autocomplete list (~1500 entries fetched on load)

**Recommendations**:
- Lazy load game modes
- Memoize hint sequence generation and Pokemon info
- Use `prefetchPokemonBundle()` (exists but unused) to preload the next Pokemon
- Consider virtualizing the autocomplete dropdown for large lists

### 3. Testing

**Issues**:
- Limited test coverage (only auth tests visible)
- No tests for hint system or difficulty logic
- No tests for form Pokemon handling

**Recommendations**:
- Add unit tests for `generateHintSequence()` across all difficulties
- Test deterministic RNG for daily mode (same date = same sequence)
- Test `isCloseMatch()` with form name variations
- Test `getEvolutionMethod()` and `hasSplitEvolution()` with various chain structures
- Test `getSpecialStatus()` with form Pokemon to verify base species ID passthrough
- Add E2E tests for game flow

### 4. Accessibility

**Issues**:
- Audio controls may not be accessible
- No ARIA labels on hint blocks
- Form validation not announced to screen readers

**Recommendations**:
- Add `aria-label` to hint blocks
- Ensure audio controls are keyboard accessible
- Add live regions for game state changes (guess result, hint reveal)
- Test with screen readers

### 5. Data Validation

**Issues**:
- No runtime validation of API responses
- Pokemon ID range not validated
- Guess input not sanitized

**Recommendations**:
- Use Zod for runtime validation of API responses
- Validate that selected Pokemon IDs are in `VALID_POKEMON_IDS`
- Sanitize guess input before matching

### 6. Edge Cases

**Issues**:
- Some form Pokemon may have empty move pools (Megas handled, but edge cases like Zygarde forms may differ)
- Evolution chain traversal may not handle all edge cases (e.g., Pokemon with multiple evolution methods)
- Showdown cry URLs may not exist for all form names

**Recommendations**:
- Add fallback for empty move pools
- Test evolution chain parsing with complex chains (Eevee, Tyrogue, etc.)
- Add cry URL validation with fallback to base species cry
- Consider adding Therian formes, Keldeo Resolute, and other edge-case forms in a future iteration

### 7. State Management

**Issues**:
- Multiple `useState` calls in `useGameLogic` could be consolidated
- Game state spread across multiple hooks
- localStorage operations not abstracted

**Recommendations**:
- Consider `useReducer` for complex game state
- Create custom hook for localStorage persistence with version management
- Centralize form Pokemon detection logic

### 8. Documentation

**Issues**:
- Static data in `pokemonCategories.ts` (~283 lines of hardcoded IDs) would benefit from source references
- Migration files should document when to run them relative to deployments

**Recommendations**:
- Add source comments for each ID set (e.g., "Starters: Gen 1-9, Bulbasaur through Quaquaval")
- Document the migration sequence in the README
- Add JSDoc to complex functions like `getEvolutionMethod()` and `getSpecialStatus()`

---

## Summary

This is a Next.js project implementing a Pokemon guessing game with progressive hint revelation. The hint system uses a tiered approach where hints are classified by difficulty (Easy/Medium/Hard), and the game mode determines which tiers are available and how many guesses the player gets.

**Key Architecture Decisions**:
- **Tiered hints**: 13 randomizable hints across 3 tiers + 2 fixed finals, rather than a flat pool
- **Difficulty modes**: Variable guess counts (7/6/5) and hint pools per difficulty
- **Expanded target pool**: ~1196 Pokemon including Mega Evolutions and regional forms via weighted selection
- **Form-safe species lookup**: Uses `pokemon.species.url` to resolve the base species ID, ensuring form Pokemon inherit correct metadata
- **Normalized matching**: Strips separators for exact match before falling back to fuzzy search
- **Deterministic daily challenges**: Seeded RNG produces the same Pokemon, difficulty, and hint sequence for all players on a given day

**Strengths**:
- Clean separation of concerns (hooks, components, utils, static data)
- Smart caching strategy with stale-while-revalidate and deduplication
- Stale-load guards prevent race conditions from overlapping Pokemon loads
- Deterministic daily challenges with backward-compatible localStorage migration
- Comprehensive statistics tracking with difficulty segmentation
- Strong TypeScript typing with no `as any` casts

**Priority Improvements**:
1. Add tests for hint system, difficulty logic, and form Pokemon handling
2. Add error boundaries and user-friendly error states
3. Improve accessibility (ARIA labels, keyboard navigation, screen reader support)
4. Add runtime validation for API responses
5. Expand form coverage to include Therian formes and other edge cases
