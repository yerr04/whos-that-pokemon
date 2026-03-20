# Supabase Google Auth Refactor - Issues & Solutions

## Issues Identified

### 1. **Browser Client Cookie Handling**
**Problem**: The browser Supabase client wasn't properly handling cookies, which is essential for session persistence and SSR compatibility.

**Solution**: Updated `src/utils/supabase/client.ts` to properly implement cookie handling with `getAll()` and `setAll()` methods that read/write cookies from `document.cookie`.

### 2. **No Session Refresh Middleware**
**Problem**: Sessions could expire without automatic refresh, leading to timeout errors and authentication failures.

**Solution**: Created `src/middleware.ts` that:
- Automatically refreshes Supabase sessions on every request
- Integrates with existing route protection logic
- Prevents token expiration issues

### 3. **Excessive Auth API Calls**
**Problem**: Multiple redundant calls to `getUser()` and `getSession()`:
- `layout.tsx` called both `getSession()` and `getUser()` on every page load
- `useAuth` hook called `getUser()` on mount AND set up a listener that called it again
- `Navbar` created its own client and called `getSession()` on mount
- `recordGameResult` called `getUser()` every time a game finished

**Solution**:
- Removed redundant `getSession()` call from `layout.tsx` (middleware handles refresh)
- Optimized `useAuth` to only listen for auth state changes, not call `getUser()` on mount
- Updated `Navbar` to use context client and remove redundant `getSession()` call
- Updated `recordGameResult` to accept `userId` and `supabase` as parameters

### 4. **Multiple Supabase Client Instances**
**Problem**: Creating new Supabase clients everywhere instead of reusing the context instance:
- `useUserStats` created a new client
- `recordGameResult` created a new client
- `Navbar` created a new client

**Solution**:
- Updated `useUserStats` to use `useSupabase()` context
- Updated `recordGameResult` to accept supabase client as parameter
- Updated `Navbar` to use `useSupabase()` context
- Updated game hooks (`usePokemonGame`, `useDailyChallenge`) to pass context client

### 5. **Inefficient Auth State Management**
**Problem**: Auth state was being fetched multiple times unnecessarily, causing race conditions and timeout issues.

**Solution**:
- Middleware handles session refresh automatically
- Layout only calls `getUser()` once (middleware ensures fresh session)
- `useAuth` hook relies on initial user from props and only refreshes on auth state changes
- All components use the same context client instance

## Data Requirements (from migration file)

The system only needs to record:
- **Game sessions** (`game_sessions` table): One row per finished game
- **User mode totals** (`user_mode_totals` table): Aggregated stats per user+mode
- **User hint totals** (`user_hint_totals` table): Hint performance aggregates
- **Profiles** (`profiles` table): User display data (auto-created via trigger)

All data is recorded via the `apply_game_result` RPC function, which handles all inserts/updates atomically.

## Key Improvements

1. **Reduced API Calls**: Eliminated ~5-10 redundant auth calls per page load
2. **Automatic Session Refresh**: Middleware ensures tokens stay fresh
3. **Single Client Instance**: All components share the same Supabase client from context
4. **Better Error Handling**: Proper error handling in all hooks
5. **Optimized Auth Flow**: Auth state changes trigger updates without extra API calls

## Files Modified

1. `src/utils/supabase/client.ts` - Added proper cookie handling
2. `src/middleware.ts` - NEW: Automatic session refresh
3. `src/app/layout.tsx` - Removed redundant `getSession()` call
4. `src/hooks/useAuth.ts` - Optimized to avoid redundant `getUser()` calls
5. `src/hooks/useUserStats.ts` - Use context client instead of creating new one
6. `src/utils/stats.ts` - Accept userId and supabase as parameters
7. `src/components/Navbar.tsx` - Use context client, remove redundant calls
8. `src/hooks/usePokemonGame.ts` - Pass userId and supabase to recordGameResult
9. `src/hooks/useDailyChallenge.ts` - Pass userId and supabase to recordGameResult

## Testing Recommendations

1. Test Google OAuth sign-in flow
2. Verify session persistence across page refreshes
3. Test game result recording (both daily and unlimited modes)
4. Monitor network requests to confirm reduced API calls
5. Test session expiration and automatic refresh
