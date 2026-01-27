# Testing Guide for Auth Refactor

## Quick Verification Checklist

### 1. **Local Development Setup**
```bash
# Make sure your local Supabase is running
npm run dev

# In another terminal, start Supabase locally (if using local dev)
supabase start
```

### 2. **Monitor Network Requests**

**Chrome DevTools Method:**
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Filter by "Fetch/XHR" to see API calls
4. Look for calls to your Supabase URL

**What to Check:**
- ✅ Should see **fewer** `getUser()` calls (ideally 1-2 per page load instead of 5-10)
- ✅ Should see session refresh happening automatically (check middleware calls)
- ✅ No duplicate auth requests

### 3. **Test Scenarios**

#### A. **Google OAuth Sign-In Flow**
1. Navigate to `/auth/sign-in`
2. Click "Continue with Google"
3. Complete Google authentication
4. **Verify:**
   - ✅ Redirects back to your app successfully
   - ✅ User avatar appears in navbar
   - ✅ No console errors
   - ✅ Check Network tab - should see minimal auth calls

#### B. **Session Persistence**
1. Sign in with Google
2. Refresh the page (F5)
3. Navigate to different pages
4. **Verify:**
   - ✅ User stays logged in after refresh
   - ✅ No "session expired" errors
   - ✅ Avatar/profile still visible
   - ✅ Can access protected routes (`/profile`, `/stats`)

#### C. **Game Result Recording**
1. Sign in with Google
2. Play a game (daily or unlimited mode)
3. Complete the game (win or lose)
4. **Verify:**
   - ✅ Check browser console - should see "Successfully recorded game result"
   - ✅ No errors about missing user
   - ✅ Check Network tab - should see ONE RPC call to `apply_game_result`
   - ✅ No redundant `getUser()` calls before recording

#### D. **Profile/Stats Page**
1. Sign in with Google
2. Navigate to `/profile` or `/stats`
3. **Verify:**
   - ✅ Page loads without errors
   - ✅ Stats display correctly (if you have any)
   - ✅ Check Network tab - should see minimal database queries
   - ✅ No timeout errors

#### E. **Sign Out Flow**
1. Sign in with Google
2. Sign out (if you have a sign-out button)
3. **Verify:**
   - ✅ Redirects to appropriate page
   - ✅ User state clears properly
   - ✅ Can sign in again without issues

### 4. **Check for Specific Issues**

#### Issue: Too Many Requests
**Before Fix:** You'd see 5-10+ auth calls per page load
**After Fix:** Should see 1-2 auth calls per page load

**How to Verify:**
```javascript
// In browser console, you can count Supabase calls:
// Open Network tab, filter by your Supabase URL
// Count the number of calls on page load
```

#### Issue: Timeout Errors
**Before Fix:** Frequent timeout errors, especially after inactivity
**After Fix:** Middleware refreshes sessions automatically

**How to Verify:**
1. Sign in
2. Wait 5-10 minutes (or until token would normally expire)
3. Navigate to a new page
4. **Should NOT see timeout errors** - middleware refreshes token automatically

### 5. **Console Checks**

**Good Signs (No Errors):**
- ✅ No "AuthSessionMissingError" (unless actually logged out)
- ✅ No "Failed to fetch authenticated user" errors
- ✅ No timeout errors
- ✅ "Successfully recorded game result" messages when games complete

**Bad Signs (Issues):**
- ❌ Multiple "Failed to fetch authenticated user" errors
- ❌ "Too many requests" errors
- ❌ Timeout errors
- ❌ "No authenticated user" errors when you ARE logged in

### 6. **Database Verification**

After playing a game, verify data was saved:

```sql
-- Check if game session was recorded
SELECT * FROM game_sessions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if stats were updated
SELECT * FROM user_mode_totals 
WHERE user_id = 'your-user-id';

-- Check hint totals
SELECT * FROM user_hint_totals 
WHERE user_id = 'your-user-id';
```

### 7. **Performance Monitoring**

**Before Fix:**
- Multiple simultaneous auth requests
- Race conditions causing errors
- Slow page loads due to redundant calls

**After Fix:**
- Single auth call per page load (from layout)
- Middleware handles refresh in background
- Faster page loads

**How to Measure:**
1. Open DevTools → Network tab
2. Enable "Disable cache"
3. Reload page
4. Check "Load" time - should be faster
5. Count Supabase API calls - should be fewer

### 8. **Edge Cases to Test**

1. **Rapid Navigation:**
   - Quickly navigate between pages
   - **Should:** Handle gracefully, no errors

2. **Multiple Tabs:**
   - Sign in in one tab
   - Open app in another tab
   - **Should:** Both tabs show logged in state

3. **Token Expiration:**
   - Sign in
   - Wait for token to expire (or manually expire it)
   - Navigate to new page
   - **Should:** Automatically refresh, no errors

4. **Game Recording Without Auth:**
   - Play game while NOT logged in
   - **Should:** Game works, but no recording (should see console warning, not error)

### 9. **Quick Test Script**

Run this in browser console after signing in:

```javascript
// Check current user
const { createClient } = await import('/src/utils/supabase/client.js');
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Has session:', !!session);
console.log('Session expires:', session?.expires_at ? new Date(session.expires_at * 1000) : 'N/A');
```

### 10. **Production Checklist**

Before pushing to production:

- [ ] All local tests pass
- [ ] No console errors in development
- [ ] Network requests are optimized (check count)
- [ ] Game recording works for both modes
- [ ] Session persistence works across refreshes
- [ ] OAuth flow completes successfully
- [ ] Protected routes work correctly
- [ ] No timeout errors during normal usage
- [ ] Database queries are efficient

### 11. **Monitoring in Production**

After deploying, monitor:

1. **Error Rates:**
   - Check your error tracking (Sentry, etc.)
   - Look for auth-related errors

2. **API Usage:**
   - Check Supabase dashboard for API call counts
   - Should see reduced calls per user session

3. **User Feedback:**
   - Watch for reports of login issues
   - Monitor timeout complaints

## Troubleshooting

### If you see "Too many requests":
- Check middleware is running (should see it in Network tab)
- Verify you're using context client everywhere
- Check for any remaining `createClient()` calls outside context

### If sessions expire:
- Verify middleware is refreshing sessions
- Check cookie settings (should be set by middleware)
- Ensure middleware matcher includes your routes

### If game results don't save:
- Check browser console for errors
- Verify user is logged in when game completes
- Check Network tab for RPC call to `apply_game_result`
- Verify RLS policies allow user to insert
