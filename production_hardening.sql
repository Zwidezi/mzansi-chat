-- ═══════════════════════════════════════════════════
-- MZANSICHAT: PRODUCTION HARDENING SQL
-- Run this in Supabase SQL Editor
-- Date: 2026-04-09
-- ═══════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- FIX #1: Protect recovery_hash from public reads
-- ─────────────────────────────────────────────────

-- 1a. Create a safe view that excludes recovery_hash
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
  id, user_id, created_at, handle, name, about,
  profile_pic, is_verified, is_online, last_seen,
  onesignal_id, referral_count
FROM public.users;

-- 1b. Replace the wide-open SELECT policy with auth-required
DROP POLICY IF EXISTS "Anyone can read user profiles" ON public.users;
CREATE POLICY "Auth users read profiles" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 1c. Grant access to the safe view for anon and authenticated roles
GRANT SELECT ON public.users_public TO anon, authenticated;

-- ─────────────────────────────────────────────────
-- FIX #4: Atomic member_count increment
-- ─────────────────────────────────────────────────

-- Create RPC for atomic join
CREATE OR REPLACE FUNCTION public.join_community_atomic(p_community_id UUID, p_user_handle TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert membership (will fail on duplicate due to UNIQUE constraint)
  INSERT INTO public.community_members (community_id, user_handle)
  VALUES (p_community_id, p_user_handle);

  -- Atomic increment
  UPDATE public.communities
  SET member_count = member_count + 1
  WHERE id = p_community_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Already a member, do nothing
    NULL;
END;
$$;

-- Create RPC for atomic leave
CREATE OR REPLACE FUNCTION public.leave_community_atomic(p_community_id UUID, p_user_handle TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_handle = p_user_handle;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  IF rows_deleted > 0 THEN
    UPDATE public.communities
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = p_community_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.join_community_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_community_atomic(UUID, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────
-- FIX: Add sign-in attempt rate limiting table
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  ip_hint TEXT, -- Optional: from server-side function
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_auth_attempts_handle ON public.auth_attempts(handle, attempted_at);

-- RLS: only server (service key) should insert, but allow the get_my_handle user to read their own
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated (the app tracks attempts client-side too)
CREATE POLICY "Auth users log attempts" ON public.auth_attempts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users read own attempts" ON public.auth_attempts
  FOR SELECT USING (handle = public.get_my_handle());

-- Helper function to check if handle is locked out (>5 failed attempts in 15 min)
CREATE OR REPLACE FUNCTION public.is_handle_locked(p_handle TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*) >= 5
  FROM public.auth_attempts
  WHERE handle = lower(p_handle)
    AND success = false
    AND attempted_at > (now() - interval '15 minutes');
$$;

GRANT EXECUTE ON FUNCTION public.is_handle_locked(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════
-- VERIFICATION: Run these to check everything applied
-- ═══════════════════════════════════════════════════
-- SELECT * FROM pg_policies WHERE tablename = 'users';
-- SELECT * FROM pg_policies WHERE tablename = 'auth_attempts';
-- SELECT * FROM pg_views WHERE viewname = 'users_public';
-- SELECT proname FROM pg_proc WHERE proname IN ('join_community_atomic', 'leave_community_atomic', 'is_handle_locked');
