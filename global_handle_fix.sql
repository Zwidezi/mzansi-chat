-- ═══════════════════════════════════════
-- MzansiChat: Global Signup-Resilient Handle Fix
-- ═══════════════════════════════════════

-- This function is the "heart" of your database security. 
-- Most of your RLS policies use it to identify the current user's handle.
-- By making it smarter, we fix all 403 errors across the whole app.

CREATE OR REPLACE FUNCTION public.get_my_handle()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Step 1: Try to find the handle in the 'users' table (standard)
  -- Step 2: If record doesn't exist yet (signup lag), pull from JWT metadata (instant)
  SELECT COALESCE(
    (SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1),
    (auth.jwt() -> 'user_metadata' ->> 'handle')
  );
$$;

-- Verification query (optional - run after to check yourself)
-- SELECT public.get_my_handle();
