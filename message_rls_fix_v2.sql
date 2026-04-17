-- ═══════════════════════════════════════
-- MzansiChat: Message RLS Fix v2
-- Problem: Anonymous auth doesn't store handle in user_metadata,
-- so JWT-based RLS checks always fail → 403 on INSERT/SELECT
-- Fix: Use ONLY users table lookup (reliable) + set user_metadata on signup
-- ═══════════════════════════════════════

-- 1. Drop ALL existing message policies
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- 2. Simple, reliable SELECT policy
-- A user can read messages if their handle appears in the chat_id
-- (DM chat_ids are "handle1_handle2", community chat_ids are community IDs)
CREATE POLICY "Users read own conversations"
ON public.messages FOR SELECT
USING (
  -- Lindiwe AI chat — anyone can read
  chat_id = 'lindiwe'
  OR
  -- DM: check if user's handle is part of the chat_id
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
    AND (
      chat_id LIKE (handle || '_%')
      OR chat_id LIKE ('%_' || handle)
      OR chat_id = handle  -- for future 1-to-self chats
    )
  )
  OR
  -- Community chat: check membership
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id::text = chat_id
    AND user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- 3. Simple, reliable INSERT policy
-- Any authenticated user can send a message if the sender_handle matches their profile
CREATE POLICY "Users send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND sender_handle = (
    SELECT handle FROM public.users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 4. DELETE policy — users can delete their own messages
CREATE POLICY "Users delete own messages"
ON public.messages FOR DELETE
USING (
  sender_handle = (
    SELECT handle FROM public.users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 5. Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;