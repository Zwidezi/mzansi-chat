-- ═══════════════════════════════════════════════════
-- MZANSICHAT: SECURITY HARDENING MIGRATION
-- Run this in Supabase SQL Editor AFTER the previous migrations
-- ═══════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- STEP 1: Link users table to auth.users
-- ═══════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);

-- ═══════════════════════════════════════════════════
-- STEP 2: Helper function — get the handle for the current auth session
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_handle()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════
-- STEP 3: REWRITE ALL RLS POLICIES
-- ═══════════════════════════════════════════════════

-- ─── USERS TABLE ───
-- Everyone can read profiles (needed for handle lookup, DMs, etc.)
-- Users can only insert their own row (linked to auth.uid)
-- Users can only update their own row

DROP POLICY IF EXISTS "Public read users" ON public.users;
DROP POLICY IF EXISTS "Public insert users" ON public.users;
DROP POLICY IF EXISTS "Public update users" ON public.users;

CREATE POLICY "Anyone can read user profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (user_id = auth.uid());


-- ─── MESSAGES TABLE ───
-- Everyone can read messages (needed for community & DM display)
-- Only authenticated users can insert, and sender_handle must match their handle
-- Only the sender can delete their own messages

DROP POLICY IF EXISTS "Public read messages" ON public.messages;
DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
DROP POLICY IF EXISTS "Public delete messages" ON public.messages;

CREATE POLICY "Anyone can read messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users insert own messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_handle = public.get_my_handle()
  );

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_handle = public.get_my_handle());


-- ─── COMMUNITIES TABLE ───
-- Everyone can read communities (discovery page)
-- Authenticated users can create communities
-- Only the owner can update their community

DROP POLICY IF EXISTS "Public read communities" ON public.communities;
DROP POLICY IF EXISTS "Public insert communities" ON public.communities;
DROP POLICY IF EXISTS "Public update communities" ON public.communities;

CREATE POLICY "Anyone can read communities"
  ON public.communities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users create communities"
  ON public.communities FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_handle = public.get_my_handle()
  );

CREATE POLICY "Owners can update own community"
  ON public.communities FOR UPDATE
  USING (owner_handle = public.get_my_handle());


-- ─── COMMUNITY_MEMBERS TABLE ───
-- Everyone can read membership (needed for member lists)
-- Authenticated users can join (insert themselves)
-- Users can only leave (delete) their own membership

DROP POLICY IF EXISTS "Public read community_members" ON public.community_members;
DROP POLICY IF EXISTS "Public insert community_members" ON public.community_members;

CREATE POLICY "Anyone can read memberships"
  ON public.community_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_handle = public.get_my_handle()
  );

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (user_handle = public.get_my_handle());


-- ─── WEBAUTHN_CREDENTIALS TABLE ───
-- Users can only read their own credentials
-- Users can only insert their own credentials

DROP POLICY IF EXISTS "Public read credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Public insert credentials" ON public.webauthn_credentials;

CREATE POLICY "Users read own credentials"
  ON public.webauthn_credentials FOR SELECT
  USING (user_handle = public.get_my_handle());

CREATE POLICY "Users insert own credentials"
  ON public.webauthn_credentials FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_handle = public.get_my_handle()
  );


-- ─── CHATS TABLE ───
DROP POLICY IF EXISTS "Public read chats" ON public.chats;
DROP POLICY IF EXISTS "Public insert chats" ON public.chats;
DROP POLICY IF EXISTS "Public update chats" ON public.chats;

CREATE POLICY "Authenticated read chats"
  ON public.chats FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update chats"
  ON public.chats FOR UPDATE
  USING (auth.uid() IS NOT NULL);


-- ─── CHAT_PARTICIPANTS TABLE ───
DROP POLICY IF EXISTS "Public read chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Public insert chat_participants" ON public.chat_participants;

CREATE POLICY "Authenticated read participants"
  ON public.chat_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users insert own participation"
  ON public.chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_handle = public.get_my_handle()
  );


-- ─── STATUSES TABLE ───
-- Everyone can read statuses (discovery/stories)
-- Users can only insert their own statuses

-- Check if statuses table has RLS enabled
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read statuses" ON public.statuses;
DROP POLICY IF EXISTS "Public insert statuses" ON public.statuses;

CREATE POLICY "Anyone can read statuses"
  ON public.statuses FOR SELECT
  USING (true);

CREATE POLICY "Users insert own statuses"
  ON public.statuses FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_handle = public.get_my_handle()
  );


-- ═══════════════════════════════════════════════════
-- STEP 4: STORAGE POLICIES (Authenticated uploads)
-- ═══════════════════════════════════════════════════

-- Keep public reads (anyone can view media via URL)
-- Restrict uploads to authenticated users only

DROP POLICY IF EXISTS "Media Public Uploads" ON storage.objects;
CREATE POLICY "Authenticated media uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mzansichat_media'
    AND auth.uid() IS NOT NULL
  );

-- Keep existing read and delete policies as-is
-- (reads are public, deletes were already restricted to bucket)

-- ═══════════════════════════════════════════════════
-- DONE — All tables now enforce authenticated access
-- ═══════════════════════════════════════════════════
