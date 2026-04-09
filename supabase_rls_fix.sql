-- ═══════════════════════════════════════════════════
-- MZANSICHAT: CRITICAL RLS FIX — Messages Privacy
-- Run this in Supabase SQL Editor immediately!
-- Date: 2026-04-09
-- ═══════════════════════════════════════════════════

-- PROBLEM: The current policy "Anyone can read messages" allows
-- ANY authenticated user to SELECT * FROM messages.
-- That means User A can read User B ↔ User C's private DMs.

-- STEP 1: Drop the wide-open policy
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;

-- STEP 2: Create a proper policy — users can only read messages
-- from conversations they participate in.
-- DM chat_ids are "handle1_handle2" (sorted), so we check both positions.
-- Community/group chat_ids are UUIDs — we check community_members table.

CREATE POLICY "Users read own conversations" ON public.messages
FOR SELECT USING (
  -- Check if the user's handle appears in the DM chat_id
  (
    chat_id LIKE (public.get_my_handle() || '_%')
    OR
    chat_id LIKE ('%_' || public.get_my_handle())
  )
  OR
  -- Check if the user is a member of this community/group
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id::text = chat_id
    AND user_handle = public.get_my_handle()
  )
  OR
  -- Allow AI chat (lindiwe)
  chat_id = 'lindiwe'
);

-- STEP 3: Also lock down the INSERT policy to prevent impersonation
-- (current policy already checks sender_handle = get_my_handle())
-- Verify it exists:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users send messages'
  ) THEN
    CREATE POLICY "Users send messages" ON public.messages
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL 
      AND sender_handle = public.get_my_handle()
    );
  END IF;
END $$;

-- STEP 4: Tighten statuses — only authenticated users can read
DROP POLICY IF EXISTS "Anyone read active statuses" ON public.statuses;
CREATE POLICY "Auth users read active statuses" ON public.statuses
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND expires_at > NOW()
);

-- STEP 5: Tighten user profile reads — still public, but require authenticated
-- (Keep open for now since user search requires it, but restrict fields via views later)

-- ═══════════════════════════════════════════════════
-- VERIFICATION: Run these to check policies are applied
-- ═══════════════════════════════════════════════════

-- SELECT * FROM pg_policies WHERE tablename = 'messages';
-- SELECT * FROM pg_policies WHERE tablename = 'statuses';
