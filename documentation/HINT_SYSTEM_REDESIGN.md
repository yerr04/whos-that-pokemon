# Hint System Redesign

This document outlines the changes made to the hint system, the addition of difficulty modes, and the expansion of the Pokemon target pool to include alternate forms.

---

## Table of Contents

1. [Motivation](#motivation)
2. [What Changed (Summary)](#what-changed-summary)
3. [New Hint Categories](#new-hint-categories)
4. [Difficulty Tiers](#difficulty-tiers)
5. [Alternate Forms as Guessable Targets](#alternate-forms-as-guessable-targets)
6. [File-by-File Changelog](#file-by-file-changelog)
7. [Data Flow](#data-flow)
8. [Migration Notes](#migration-notes)

---

## Motivation

The original hint system drew from a flat pool of 9 hint types (bst, region, ability, types, pokedex, move, evolution, height, weight), shuffled them, and presented 4 random hints followed by cry and silhouette. The problem was that several of these hints — particularly BST, height, and weight — are niche knowledge that most players can't act on, making the game feel less engaging.

The redesign draws inspiration from Pokedoku's category system (type, region, special status, evolution method) and introduces:

- **New hint types** that are more intuitive and actionable (special status, evolution method, split evolution, special forms)
- **Difficulty tiers** so hints are classified by how much knowledge they require
- **Difficulty modes** (Easy/Medium/Hard) with different guess counts and hint pools
- **Alternate form Pokemon** (Megas, regional forms) as guessable targets

---

## What Changed (Summary)

| Area | Before | After |
|------|--------|-------|
| **Hint types** | 9 randomizable + 2 fixed (11 total) | 13 randomizable + 2 fixed (15 total) |
| **Hint selection** | Flat shuffle, pick 4 | Tier-based: draw from allowed pools per difficulty |
| **Difficulty** | None (always 7 guesses, 6 hints) | Easy (7/6), Medium (6/5), Hard (5/4) |
| **Daily difficulty** | N/A | Seeded from date, shown as badge |
| **Pokemon pool** | IDs 1–1025 | IDs 1–1025 + ~171 alternate forms (~1196 total) |
| **Form selection** | N/A | Weighted ~8% forms, ~92% base |
| **Display names** | `capitalize(name)` | Suffix format for forms: "Venusaur (Mega)" |
| **Autocomplete** | 1025 base Pokemon | 1025 base + ~171 forms, searched by name and display name |
| **Species lookup** | `getSpecies(pokemon.id)` | `getSpecies(extractSpeciesId(pokemon.species.url))` — critical for form Pokemon |
| **Evolution chain** | Flat 3-level nesting | Recursive `EvolutionChainNode` with `evolution_details` |
| **Stats recording** | No difficulty field | Includes `p_difficulty` in Supabase RPC |

---

## New Hint Categories

Four new hint types were added to the existing set:

### `specialStatus` (Tier 1 — Easy)

Displays the Pokemon's special classification based on both PokeAPI flags and static ID sets.

**Possible values**: Legendary, Mythical, Baby, Ultra Beast, Paradox, Starter, Fossil, Pseudo-Legendary, None

**Data sources**:
- `species.is_legendary`, `species.is_mythical`, `species.is_baby` — from the Species endpoint (fields added to the `Species` interface)
- `STARTER_IDS`, `FOSSIL_IDS`, `ULTRA_BEAST_IDS`, `PARADOX_IDS`, `PSEUDO_LEGENDARY_IDS` — static `Set<number>` in `src/data/pokemonCategories.ts`

**Priority order**: API flags are checked first (legendary > mythical > baby), then static sets (ultra beast > paradox > starter > fossil > pseudo-legendary), falling back to "None".

### `evolutionMethod` (Tier 2 — Medium)

Displays how this specific Pokemon was reached in its evolution chain.

**Possible values**: Trade, Trade (with item name), Item (with item name), Friendship, Level-Up, N/A (for first-stage Pokemon), Other

**Data source**: The `evolution_details` array on each `EvolutionChainNode` in the evolution chain response. The function `getEvolutionMethod()` walks the chain to find the node matching the target Pokemon and reads its trigger.

### `splitEvolution` (Tier 2 — Medium)

Indicates whether the Pokemon's evolution line has branching paths (e.g., Eevee, Ralts/Gardevoir/Gallade).

**Possible values**: Split Evolution, Linear Evolution, No Evolution Line

**Data source**: `hasSplitEvolution()` recursively checks if any node in the evolution chain has `evolves_to.length > 1`.

### `specialForms` (Tier 2 — Medium)

Indicates what alternate forms exist for this Pokemon, or what kind of form it is if it's an alternate form itself.

**Possible values when target is a base Pokemon**: Has Mega Evolution, Has Gigantamax Form, Has Regional Variant, or combinations thereof

**Possible values when target IS a form**: Is Mega Evolution, Is Alolan Form, Is Galarian Form, Is Hisuian Form, Is Paldean Form, Is Alternate Forme

**Data source**: Static ID sets (`HAS_MEGA_IDS`, `GIGANTAMAX_IDS`, `HAS_REGIONAL_FORM_IDS`, `MEGA_FORM_IDS`, `ALOLAN_FORM_IDS`, etc.) in `pokemonCategories.ts`.

---

## Difficulty Tiers

### Tier Classification

Each hint type is assigned a tier based on how much Pokemon knowledge it requires:

| Tier | Label | Hints | Rationale |
|------|-------|-------|-----------|
| **1** | Easy | `types`, `region`, `specialStatus`, `evolution` | Broad categories most fans know intuitively |
| **2** | Medium | `ability`, `move`, `pokedex`, `evolutionMethod`, `splitEvolution`, `specialForms` | Requires specific knowledge or reading comprehension |
| **3** | Hard | `bst`, `height`, `weight` | Niche numeric data only hardcore fans know |
| **Fixed** | — | `cry`, `silhouette` | Always the final 2 hints regardless of difficulty |

### Difficulty Modes

| Mode | Max Guesses | Hint Count | Draws From | Total Hints |
|------|-------------|------------|------------|-------------|
| **Easy** | 7 | 4 randomizable | Tier 1 + Tier 2 | 4 + cry + silhouette = 6 |
| **Medium** | 6 | 3 randomizable | Tier 1 + Tier 2 + Tier 3 | 3 + cry + silhouette = 5 |
| **Hard** | 5 | 2 randomizable | Tier 2 + Tier 3 (no Tier 1) | 2 + cry + silhouette = 4 |

### How Hints Are Selected

```
generateHintSequence(difficulty, rng?):
  1. Build pool from allowed tiers (e.g., Easy = Tier 1 + Tier 2 = 10 hints)
  2. Fisher-Yates shuffle the pool (using seeded RNG for daily mode)
  3. Take first N hints (N = config.hintCount)
  4. Append 'cry' and 'silhouette'
  5. Return the sequence
```

### Unlimited Mode

Players see three pill buttons (Easy / Medium / Hard) above the game. Selecting a difficulty reloads with a new Pokemon and new hint sequence drawn from the appropriate pool. Default is Medium.

### Daily Mode

Difficulty is determined deterministically from the date seed:
```
getDailyDifficulty(dateKey):
  rng = createSeededRandom("difficulty:" + dateKey)
  return ['easy', 'medium', 'hard'][floor(rng() * 3)]
```

A colored badge shows "Today's Difficulty: Easy/Medium/Hard" below the title. All players get the same difficulty, Pokemon, and hint sequence for a given day.

---

## Alternate Forms as Guessable Targets

### Expanded Pokemon Pool

The game now includes alternate forms with genuine gameplay differences (different types, stats, abilities) as possible targets. All are accessible via the standard `/api/v2/pokemon/{id}` endpoint:

| Category | ID Range | Count | Examples |
|----------|----------|-------|----------|
| Mega Evolutions | 10033–10090 | ~58 | Venusaur-Mega, Charizard-Mega-X |
| Alolan Forms | 10091–10115 | ~25 | Vulpix-Alola, Marowak-Alola |
| Zygarde Forms | 10118–10120 | 3 | Zygarde-10, Zygarde-Complete |
| Galarian Forms | 10161–10180 | ~20 | Ponyta-Galar, Corsola-Galar |
| Hisuian Forms | 10229–10244 | ~16 | Growlithe-Hisui, Zorua-Hisui |
| Paldean Wooper | 10253 | 1 | Wooper-Paldea |
| Additional Megas | 10278–10325 | ~48 | Beedrill-Mega, Pidgeot-Mega |

**Total**: ~1025 base + ~171 forms = ~1196 Pokemon

Edge-case forms (Therian formes, Keldeo Resolute, etc.) are deferred to a future iteration.

### Weighted Selection

Forms appear ~8% of the time to keep the game accessible:

```typescript
selectRandomPokemon(rng):
  if rng() < 0.08 → pick random form from ALL_FORM_IDS
  else             → pick random base Pokemon (1–1025)
```

This applies to both unlimited mode (`Math.random`) and daily mode (seeded RNG).

### Display Names

Form Pokemon use a suffix format for clarity:

| API Name | Display Name |
|----------|-------------|
| `venusaur-mega` | Venusaur (Mega) |
| `charizard-mega-x` | Charizard (Mega X) |
| `vulpix-alola` | Vulpix (Alolan) |
| `ponyta-galar` | Ponyta (Galarian) |
| `growlithe-hisui` | Growlithe (Hisuian) |
| `wooper-paldea` | Wooper (Paldean) |
| `zygarde-complete` | Zygarde (Complete Forme) |

The `formatFormDisplayName()` function in `pokemonCategories.ts` parses API names via regex to produce these.

### Species Lookup for Forms

This was a critical change. Form Pokemon (e.g., Mega Venusaur at ID 10033) share a species with their base form (Venusaur, species ID 3). The old code called `getSpecies(pokemon.id)` which would fail for form IDs since there's no species at ID 10033.

The fix: the `Pokemon` interface now includes a `species` field with a URL. We extract the species ID from that URL:

```
pokemon.species.url = "https://pokeapi.co/api/v2/pokemon-species/3/"
extractSpeciesId(url) → 3
getSpecies(3) → works correctly
```

This means `is_legendary`, `is_baby`, `is_mythical`, evolution chain, and flavor text all come from the base species — which is correct behavior.

### Autocomplete

The Pokemon list hook now fetches `?limit=1500` (up from 1025) to include form entries. Results are filtered to only include IDs in `VALID_IDS` (base 1–1025 + all form IDs). Fuse.js searches both the API `name` and `displayName` fields, so typing "mega charizard" or "alolan vulpix" both work.

The localStorage cache key was changed to `pokemon-name-list-v2` to bust old caches that don't include form entries.

### Guess Matching for Forms

`handleGuess()` in both game modes now checks against both the API name (`venusaur-mega`) and the display name (`Venusaur (Mega)`) using `isCloseMatch()`. This ensures players can type either format and get a match.

---

## File-by-File Changelog

### New Files

| File | Purpose |
|------|---------|
| `src/data/pokemonCategories.ts` | Static ID sets (starters, fossils, UBs, paradox, pseudo-legendaries, gigantamax, mega/regional form hints), form ID ranges, `VALID_POKEMON_IDS`, weighted selection, display name formatter, special status/forms helpers |
| `src/utils/supabase/migration/add_difficulty_and_new_hints.sql` | Database migration: adds `difficulty` column to `game_sessions`, backfills existing rows, and replaces `apply_game_result` to accept the new `p_difficulty` parameter |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/game.ts` | Added 4 `HintType` values, `Difficulty` type, `HINT_TIERS`, `DifficultyConfig`, `DIFFICULTY_CONFIG`, `TIER_1/2/3_HINTS`, expanded `ParsedPokemonInfo` with `specialStatus`, `evolutionMethod`, `hasSplitEvolution`, `specialForms` |
| `src/lib/pokeapi.ts` | Added `species` to `Pokemon`, added `is_baby`/`is_legendary`/`is_mythical` to `Species`, replaced flat `EvolutionChain` with recursive `EvolutionChainNode` including `evolution_details` |
| `src/utils/pokemon.ts` | Added `getDisplayName`, `getEvolutionMethod`, `hasSplitEvolution`. Updated `getEvolutionStage` for form support (accepts `speciesName`). Rewrote `generateHintSequence` to accept `Difficulty` and draw from tier pools. Renamed "Second Stage" to "Middle Stage" |
| `src/hooks/useGameLogic.ts` | Uses `extractSpeciesId` for form-safe species lookup. Populates new `ParsedPokemonInfo` fields. Tracks `displayName` separately. Accepts dynamic `maxGuesses`. Matches against both API and display names |
| `src/hooks/usePokemonGame.ts` | Added `difficulty` state with `changeDifficulty`. Uses `selectRandomPokemon` for weighted form selection. Passes difficulty to `generateHintSequence`. Dynamic `maxGuesses` from config. Records difficulty in stats |
| `src/hooks/useDailyChallenge.ts` | Seeded difficulty via `getDailyDifficulty`. Uses `selectRandomPokemon` with seeded RNG. Stores difficulty in `DailyGameState` with backward-compat backfill. Dynamic `maxGuesses` |
| `src/hooks/usePokemonList.ts` | Storage key bumped to v2. Fetches `?limit=1500`. Filters to `VALID_IDS`. Added `displayName` field. Fuse.js searches both `name` and `displayName` |
| `src/components/HintBlock.tsx` | Added render cases for `specialStatus`, `evolutionMethod`, `splitEvolution`, `specialForms` |
| `src/components/GameInterface.tsx` | Added difficulty selector (pill buttons for unlimited, badge for daily). Dynamic `maxGuesses`. Shows `displayName` in win/loss. Added `difficulty`/`changeDifficulty` props |
| `src/components/PokemonAutocomplete.tsx` | Shows `displayName` in suggestion dropdown |
| `src/app/unlimited/page.tsx` | Passes `difficulty`, `changeDifficulty`, `displayName`, `maxGuesses` |
| `src/app/daily/page.tsx` | Passes `difficulty`, `maxGuesses` |
| `src/utils/stats.ts` | Added optional `difficulty` field, passed as `p_difficulty` to Supabase RPC |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Pokemon Selection                           │
│  selectRandomPokemon(rng)                                       │
│    → 92% chance: random base ID (1–1025)                        │
│    → 8% chance: random form ID from ALL_FORM_IDS                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Loading (useGameLogic)                  │
│  getPokemon(id)              → stats, types, abilities, sprites │
│  extractSpeciesId(url)       → base species ID                  │
│  getSpecies(speciesId)       → is_legendary, generation, etc.   │
│  getEvolutionChain(url)      → recursive chain with triggers    │
│  Static lookups              → starter/fossil/UB status, forms  │
│                                                                 │
│  Outputs: ParsedPokemonInfo (15 fields)                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Hint Sequence (generateHintSequence)             │
│  Input: difficulty (easy/medium/hard) + optional seeded RNG     │
│  1. Build pool from TIER_1 + TIER_2 + TIER_3 (per config)      │
│  2. Fisher-Yates shuffle                                        │
│  3. Take first N hints                                          │
│  4. Append cry + silhouette                                     │
│  Output: HintType[] (e.g., ['types', 'specialStatus', 'move',  │
│          'cry', 'silhouette'])                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Hint Revelation                                │
│  revealedHints = hintSequence.slice(0, guessesMade)             │
│  (full sequence shown on win or in debug mode)                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rendering (GameInterface)                     │
│  Difficulty selector / badge                                    │
│  Silhouette overlay (when revealed or won)                      │
│  HintBlock for each non-silhouette revealed hint                │
│  Guess progress bar (dynamic length from maxGuesses)            │
│  Win/loss with displayName (form-aware)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

### Database Migration (REQUIRED)

A new SQL migration must be run against the Supabase database **before deploying** the updated frontend:

**File**: `src/utils/supabase/migration/add_difficulty_and_new_hints.sql`

This migration does three things:

1. **Adds `difficulty text` column** to `game_sessions` — stores 'easy', 'medium', or 'hard' for each completed game.
2. **Backfills existing rows** with `'medium'` so historical data has a consistent value.
3. **Replaces `apply_game_result`** with an updated version that accepts `p_difficulty text default null` as its 10th parameter. The `default null` means the old function signature (9 params) still works if called without difficulty — but the frontend now always sends it.

**No schema changes needed** for hint types — `hint_sequence text[]` in `game_sessions` and `hint_type text` in `user_hint_totals` are both free-text, so new hint type strings like `specialStatus`, `evolutionMethod`, `splitEvolution`, and `specialForms` flow through automatically.

### Frontend Migration

- **localStorage for daily games**: Old saves without a `difficulty` field are backfilled with `'medium'` for backward compatibility.
- **localStorage for Pokemon list**: The cache key changed from `pokemon-name-list` to `pokemon-name-list-v2`, so old caches are automatically bypassed.
- **Daily Pokemon ID generation**: The algorithm changed from `(hash % 1025) + 1` to seeded weighted selection from the expanded pool. This means a different Pokemon may appear for the same date after deployment — a one-time break.
- **Old constants removed**: `RANDOMIZABLE_HINTS`, `HINT_SEQUENCE`, and the old flat `MAX_GUESSES` constant are replaced by the tiered system. `MAX_GUESSES` still exists as a legacy export (value 7) but is no longer the sole source of truth — each difficulty has its own `maxGuesses` in `DIFFICULTY_CONFIG`.
