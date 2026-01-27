# How to Apply the Database Migration

The error you're seeing means the `apply_game_result` function doesn't exist in your database yet. You need to run the migration SQL file.

## Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `src/utils/supabase/migration/add_game_stats.sql`
6. Paste it into the SQL editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see "Success" message

## Option 2: Using Supabase CLI

If you have Supabase CLI set up:

```bash
# Create a migration file
supabase migration new add_game_stats

# Copy the SQL content to the new migration file
# The file will be in supabase/migrations/TIMESTAMP_add_game_stats.sql

# Apply the migration
supabase db push
```

Or if you want to apply it directly:

```bash
# Apply the migration file directly
supabase db execute -f src/utils/supabase/migration/add_game_stats.sql
```

## Option 3: Using psql (if you have direct database access)

```bash
psql -h YOUR_DB_HOST -U postgres -d postgres -f src/utils/supabase/migration/add_game_stats.sql
```

## Verify the Migration Worked

After applying the migration, verify the function exists:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'apply_game_result';
```

You should see the function listed.

## After Applying

1. Refresh your app
2. Try playing a game again
3. The error should be gone and games should record successfully

## Important Notes

- The migration uses `CREATE OR REPLACE` and `IF NOT EXISTS`, so it's safe to run multiple times
- Make sure you're applying it to the correct database (production vs development)
- The migration creates:
  - Tables: `profiles`, `game_sessions`, `user_mode_totals`, `user_hint_totals`
  - Function: `apply_game_result`
  - Trigger: `on_auth_user_created`
