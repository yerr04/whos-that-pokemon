# Quick 5-Minute Test

## Step 1: Start Your App
```bash
npm run dev
```

## Step 2: Open Browser DevTools
1. Press `F12` to open DevTools
2. Go to **Network** tab
3. Filter by "Fetch/XHR" or your Supabase URL

## Step 3: Test Sign-In
1. Navigate to `/auth/sign-in`
2. Click "Continue with Google"
3. Complete authentication
4. **Check Network tab:** Should see minimal auth calls (1-2, not 5-10)

## Step 4: Test Session Persistence
1. After signing in, refresh the page (F5)
2. **Check:** User should still be logged in
3. **Check Network tab:** Should see middleware refreshing session

## Step 5: Test Game Recording
1. Play a game (daily or unlimited)
2. Complete the game
3. **Check Console:** Should see "Successfully recorded game result"
4. **Check Network tab:** Should see ONE RPC call to `apply_game_result`
5. **Check:** No "getUser" calls before recording (we pass userId directly now)

## Step 6: Check for Errors
1. Open **Console** tab in DevTools
2. Look for any red errors
3. **Should see:** No auth-related errors, no timeout errors

## Success Indicators ✅
- ✅ Fewer network requests (check Network tab count)
- ✅ No console errors
- ✅ User stays logged in after refresh
- ✅ Games record successfully
- ✅ No timeout errors

## If Something's Wrong ❌
- Check `TESTING_GUIDE.md` for detailed troubleshooting
- Verify middleware is running (should see it in Network tab)
- Check that all components use `useSupabase()` context
