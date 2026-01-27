# Project Walkthrough: Who's That Pokémon?

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Hint System Design & Execution](#hint-system-design--execution)
3. [TypeScript Usage](#typescript-usage)
4. [API Integrations](#api-integrations)
5. [Game Flow](#game-flow)
6. [Areas for Improvement](#areas-for-improvement)

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

### Project Structure
```
src/
├── app/              # Next.js pages (daily, unlimited, profile, auth)
├── components/       # React components (GameInterface, HintBlock, etc.)
├── hooks/           # Custom React hooks (game logic, auth, stats)
├── lib/             # External API client (pokeapi.ts)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (pokemon, stats, dailyChallenge)
└── middleware.ts    # Next.js middleware for auth & routing
```

### Design Patterns
- **Custom Hooks Pattern**: Game logic separated into reusable hooks
  - `useGameLogic`: Core game mechanics
  - `usePokemonGame`: Unlimited mode wrapper
  - `useDailyChallenge`: Daily mode with persistence
  - `useAuth`: Authentication state
  - `useUserStats`: Statistics fetching

- **Component Composition**: `GameInterface` is a reusable component that accepts game state as props

---

## Hint System Design & Execution

### Hint Types
The game defines **10 hint types** in `src/types/game.ts`:

**Randomizable Hints** (8 types):
- `bst`: Base Stat Total
- `region`: Generation/Region (Kanto, Johto, etc.)
- `ability`: Primary ability name
- `types`: Type icons (Fire, Water, etc.)
- `pokedex`: Flavor text (with Pokémon name redacted)
- `move`: Random learnable move
- `evolution`: Evolution stage (First/Second/Final/No Evolution)
- `height`: Height in meters/feet
- `weight`: Weight in kg/lbs

**Fixed Final Hints** (2 types):
- `cry`: Audio cry (6th hint)
- `silhouette`: Visual silhouette (7th hint - final)

### Hint Sequence Generation

**Location**: `src/utils/pokemon.ts` → `generateHintSequence()`

**Algorithm**:
1. Takes 8 randomizable hints
2. Shuffles them using Fisher-Yates algorithm
3. Takes first 4 shuffled hints
4. Appends `cry` (5th) and `silhouette` (6th) as fixed final hints
5. Returns array of 6 hints total

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
1. Player makes guess → `guessesMade` increments
2. `revealedHints` calculated as slice of `hintSequence[0..guessesMade]`
3. `GameInterface` maps over `revealedHints` and renders `HintBlock` components
4. Each `HintBlock` switches on hint type and displays formatted data

### Hint Data Extraction

**Location**: `src/hooks/useGameLogic.ts` → `loadPokemonData()`

**Process**:
1. Fetches Pokémon data from PokeAPI
2. Fetches species data (generation, evolution chain, flavor text)
3. Fetches evolution chain (if available)
4. Transforms raw API data into `ParsedPokemonInfo`:
   - `bst`: Sum of all base stats
   - `region`: Maps generation name → region name
   - `ability`: First ability from abilities array
   - `types`: Sorted by slot, extracted type names
   - `pokedexEntry`: English flavor text with Pokémon name redacted
   - `move`: Random move from moveset (uses seeded RNG for daily)
   - `evolutionStage`: Traverses evolution chain to determine stage
   - `height/weight`: Raw values (formatted in `HintBlock`)
   - `cryUrl`: Constructed URL to Showdown audio
   - `silhouetteUrl`: Official artwork sprite URL

### Hint Display

**Location**: `src/components/HintBlock.tsx`

**Rendering**:
- Each hint type has a switch case
- Common styling via `commonCls` (cyan border, rounded)
- Special cases:
  - `types`: Renders type icons from Showdown sprites
  - `cry`: Renders HTML5 `<audio>` controls
  - `silhouette`: Overlays on base image with `brightness(0%)` filter (revealed on win)

---

## TypeScript Usage

### Type Safety

**Strong Typing Throughout**:
- API responses: `Pokemon`, `Species`, `EvolutionChain` interfaces
- Game state: `ParsedPokemonInfo`, `HintType`, `DailyGameState`
- Function parameters: Explicit types for all functions
- Props: All components have typed props interfaces

**Key Type Definitions** (`src/types/game.ts`):
```typescript
export type HintType = 'bst' | 'region' | 'ability' | ... // Union type
export interface ParsedPokemonInfo { ... }                 // Structured data
export const MAX_GUESSES = 7                              // Constant
```

### Type Utilities

**Union Types**: `HintType` uses union for exhaustive checking
**Const Assertions**: `RANDOMIZABLE_HINTS` and `FIXED_FINAL_HINTS` arrays
**Generic Functions**: Cache system uses `<T>` for type safety

### TypeScript Patterns

1. **Discriminated Unions**: Not heavily used, but could improve game state typing
2. **Type Guards**: `isCloseMatch()` uses Fuse.js for fuzzy matching
3. **Optional Chaining**: Used extensively for API data (`pokemon.abilities[0]?.ability.name`)
4. **Type Assertions**: Minimal use (only `as any` in one place - could be improved)

### Areas for Type Improvement

- Remove `as any` in `useGameLogic.ts` line 49
- Use branded types for IDs (e.g., `type PokemonId = number & { __brand: 'PokemonId' }`)
- Add stricter types for Supabase responses
- Use `satisfies` operator for configuration objects

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
1. `GET /api/v2/pokemon/{id}` → Main Pokémon data
2. `GET /api/v2/pokemon-species/{id}` → Species metadata
3. `GET /api/v2/evolution-chain/{id}` → Evolution chain (via URL from species)

**Data Flow**:
```
loadPokemonData(id)
  → getPokemon(id)           [cached]
  → getSpecies(id)           [cached]
  → getEvolutionChain(url)   [cached]
  → Transform to ParsedPokemonInfo
```

### Supabase Integration

**Location**: `src/utils/supabase/client.ts` and `server.ts`

**Features**:
- **SSR Support**: Uses `@supabase/ssr` for cookie-based auth
- **Client/Server Separation**: Different clients for browser vs server
- **Session Management**: Middleware refreshes sessions automatically

**Database Schema** (`add_game_stats.sql`):

1. **`game_sessions`**: Raw game results
   - One row per completed game
   - Stores: mode, pokemon_id, guesses, hints, win status, hint_sequence
   - Unique constraint on `(user_id, daily_date)` for daily mode

2. **`user_mode_totals`**: Aggregated stats per mode
   - Total games, wins, win rate, streaks, hints used
   - Updated via `apply_game_result()` RPC

3. **`user_hint_totals`**: Hint performance analytics
   - Wins with each hint type, total uses
   - Tracks which hints are most effective

4. **`profiles`**: User display data
   - Mirrors auth.users with additional fields
   - Auto-created via trigger on signup

**RPC Function**: `apply_game_result()`
- Inserts game session
- Updates mode totals (upsert)
- Updates hint totals (upsert per hint in sequence)
- Handles daily mode uniqueness constraint

### External Resources

**Pokémon Showdown**:
- Type icons: `https://play.pokemonshowdown.com/sprites/types/{Type}.png`
- Cries: `https://play.pokemonshowdown.com/audio/cries/{name}.mp3`

---

## Game Flow

### Unlimited Mode Flow

```
1. User visits /unlimited
   ↓
2. usePokemonGame() hook initializes
   ↓
3. loadNewPokemon() called:
   - Generates random hint sequence
   - Selects random Pokemon ID (1-1025)
   - Calls gameLogic.loadPokemonData(id)
   ↓
4. loadPokemonData():
   - Fetches Pokemon, Species, EvolutionChain (cached)
   - Transforms to ParsedPokemonInfo
   - Sets game state
   ↓
5. GameInterface renders:
   - Shows silhouette (if revealed)
   - Shows revealed hints (based on guessesMade)
   - Input form for guesses
   ↓
6. User submits guess:
   - handleGuess() increments guessesMade
   - Checks isCloseMatch() (Fuse.js fuzzy match)
   - If correct → sets win = true
   ↓
7. On completion:
   - recordGameResult() called
   - Inserts into Supabase via RPC
   - Updates aggregates
   ↓
8. User clicks "NEXT POKÉMON" → Back to step 3
```

### Daily Mode Flow

```
1. User visits /daily
   ↓
2. useDailyChallenge() hook initializes
   ↓
3. loadDailyChallenge() called:
   - Gets today's dateKey (10 AM ET rollover)
   - Calculates deterministic Pokemon ID (FNV-1a hash)
   - Generates deterministic hint sequence (seeded RNG)
   - Checks localStorage for saved game state
   ↓
4. If saved state exists and dateKey matches:
   - Restores guesses, win status, etc.
   ↓
5. If new day or no saved state:
   - Creates new game state
   - Loads Pokemon data (with seeded RNG for move selection)
   ↓
6. Game play same as unlimited mode
   ↓
7. On each guess:
   - Updates game state
   - Saves to localStorage
   ↓
8. On completion:
   - Records to Supabase (with dailyDateKey)
   - Shows countdown to next challenge
   ↓
9. Timer checks every second:
   - Updates countdown
   - Detects date change → resets game
```

### Authentication Flow

```
1. User visits protected route (/profile)
   ↓
2. middleware.ts → proxy() checks for Supabase session cookie
   ↓
3. If no session → redirects to /auth/sign-in
   ↓
4. User signs in → redirects to /auth/callback
   ↓
5. Callback route exchanges code for session
   ↓
6. Sets cookies → redirects to original route
   ↓
7. Middleware refreshes session on each request
```

---

## Areas for Improvement

### 1. **Type Safety**

**Issues**:
- `as any` cast in `useGameLogic.ts:49`
- No branded types for IDs
- Supabase responses not strictly typed

**Recommendations**:
```typescript
// Instead of: setInfo({ ... } as any)
// Use proper typing:
setInfo({
  bst: computeBST(pokemon),
  // ... all fields properly typed
} as ParsedPokemonInfo)

// Add branded types:
type PokemonId = number & { __brand: 'PokemonId' }
type UserId = string & { __brand: 'UserId' }

// Use Supabase generated types:
import type { Database } from '@/types/supabase'
type GameSession = Database['public']['tables']['game_sessions']['row']
```

### 2. **Error Handling**

**Issues**:
- API errors only logged to console
- No user-friendly error messages
- No retry logic for failed API calls
- Cache errors not handled gracefully

**Recommendations**:
- Add error boundaries for React components
- Implement retry logic with exponential backoff
- Show user-friendly error messages
- Add fallback UI for API failures
- Consider using React Query or SWR for better error handling

### 3. **Performance**

**Issues**:
- No code splitting for game modes
- All hints rendered even when not revealed (filtered but still in DOM)
- No memoization of expensive computations
- Cache could be more sophisticated

**Recommendations**:
```typescript
// Memoize hint sequence generation
const hintSequence = useMemo(() => 
  generateHintSequence(randomFunc), 
  [randomFunc]
)

// Lazy load game modes
const DailyChallenge = lazy(() => import('./daily/page'))

// Virtualize hint list if it grows
// Prefetch next Pokemon while playing
```

### 4. **Code Organization**

**Issues**:
- Some utility functions could be better organized
- Magic numbers (1025, MAX_GUESSES) scattered
- Hint type strings duplicated

**Recommendations**:
- Create constants file for magic numbers
- Group related utilities (e.g., `pokemon/formatting.ts`, `pokemon/validation.ts`)
- Use enum or const object for hint types instead of string literals

### 5. **Testing**

**Issues**:
- Limited test coverage (only auth tests visible)
- No tests for game logic
- No tests for hint system
- No integration tests

**Recommendations**:
- Add unit tests for `generateHintSequence()`
- Test deterministic RNG for daily mode
- Test hint revelation logic
- Test fuzzy matching with edge cases
- Add E2E tests for game flow

### 6. **Accessibility**

**Issues**:
- Audio controls may not be accessible
- No ARIA labels on hint blocks
- Form validation not announced to screen readers

**Recommendations**:
- Add `aria-label` to hint blocks
- Ensure audio controls are keyboard accessible
- Add live regions for game state changes
- Test with screen readers

### 7. **Data Validation**

**Issues**:
- No runtime validation of API responses
- Pokemon ID range not validated
- Guess input not sanitized

**Recommendations**:
```typescript
// Use Zod for runtime validation
import { z } from 'zod'

const PokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  // ... validate all fields
})

// Validate before using
const pokemon = PokemonSchema.parse(await getPokemon(id))
```

### 8. **State Management**

**Issues**:
- Multiple useState calls could be consolidated
- Game state spread across multiple hooks
- localStorage operations not abstracted

**Recommendations**:
- Consider using `useReducer` for complex game state
- Create custom hook for localStorage persistence
- Use Context API for shared state (if needed)

### 9. **API Optimization**

**Issues**:
- Three separate API calls for each Pokemon
- No request batching
- Evolution chain fetched even if not needed

**Recommendations**:
- Create `prefetchPokemonBundle()` (already exists but not used)
- Batch requests where possible
- Consider GraphQL if PokeAPI supports it
- Add request cancellation for unmounted components

### 10. **User Experience**

**Issues**:
- No loading states for individual hints
- No animation for hint reveals
- Guess input doesn't show suggestions/autocomplete
- No feedback on close matches

**Recommendations**:
- Add skeleton loaders for hints
- Animate hint reveals with CSS transitions
- Add Pokemon name autocomplete (with debouncing)
- Show "close match" feedback (e.g., "Did you mean Pikachu?")

### 11. **Security**

**Issues**:
- No rate limiting on guess submissions
- No validation of Supabase RPC inputs
- CORS not explicitly configured

**Recommendations**:
- Add rate limiting middleware
- Validate all RPC inputs server-side
- Configure CORS explicitly
- Sanitize user inputs before database operations

### 12. **Documentation**

**Issues**:
- Limited inline documentation
- No JSDoc comments on complex functions
- No architecture diagrams

**Recommendations**:
- Add JSDoc to all exported functions
- Document complex algorithms (seeded RNG, evolution chain traversal)
- Create architecture diagram
- Add README sections for contributors

---

## Summary

This is a well-structured Next.js project with a solid foundation. The hint system is cleverly designed with deterministic sequences for daily mode and progressive revelation. TypeScript is used throughout, though there's room for stricter typing. The API integration includes smart caching, and the Supabase setup handles game statistics well.

**Strengths**:
- Clean separation of concerns (hooks, components, utils)
- Smart caching strategy
- Deterministic daily challenges
- Comprehensive statistics tracking
- Good use of TypeScript types

**Priority Improvements**:
1. Remove `as any` and improve type safety
2. Add error boundaries and better error handling
3. Add tests for game logic
4. Improve accessibility
5. Add runtime validation with Zod

The codebase is maintainable and follows React/Next.js best practices, with clear opportunities for enhancement in testing, accessibility, and type safety.
