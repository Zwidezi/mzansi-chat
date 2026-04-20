-- ═══════════════════════════════════════════════════
-- MZANSICHAT: PRODUCTION MASTER SYNC & HARDENING
-- Run this in Supabase SQL Editor
-- Date: 2026-04-20
-- ═══════════════════════════════════════════════════

-- 1. Schema Upgrades (Synchronization)
-- ─────────────────────────────────────────────────

-- 1a. User VoIP Support
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS peer_id TEXT;

-- 1b. Message Read Receipts Support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 1c. Community Savings Table
CREATE TABLE IF NOT EXISTS public.stokvel_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id TEXT NOT NULL,
    user_handle TEXT NOT NULL REFERENCES public.users(handle) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_reference TEXT
);

-- 1d. Financial Integrity Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_payment_ref'
    ) THEN
        ALTER TABLE public.stokvel_contributions 
        ADD CONSTRAINT unique_payment_ref UNIQUE (payment_reference);
    END IF;
END $$;

-- 2. Logic Upgrades (Functions)
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_chat_as_read(target_chat_id TEXT, viewer_handle TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.messages
    SET is_read = true
    WHERE chat_id = target_chat_id
    AND sender_handle != viewer_handle
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_chat_as_read(TEXT, TEXT) TO authenticated, anon;

-- 3. Security Hardening (RLS)
-- ─────────────────────────────────────────────────

-- 3a. Stokvel Permissions
REVOKE ALL ON public.stokvel_contributions FROM anon;
GRANT SELECT, INSERT ON public.stokvel_contributions TO authenticated;
GRANT SELECT ON public.stokvel_contributions TO anon; 

-- 3b. Message Privacy (DM Regex Hardening)
DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;
CREATE POLICY "Users read own conversations"
ON public.messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    chat_id = (auth.jwt() -> 'user_metadata' ->> 'handle')
    OR (
        chat_id ~ ('^' || (auth.jwt() -> 'user_metadata' ->> 'handle') || '_') 
        OR 
        chat_id ~ ('_' || (auth.jwt() -> 'user_metadata' ->> 'handle') || '$') 
    )
    OR EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id::text = chat_id 
      AND user_handle = (auth.jwt() -> 'user_metadata' ->> 'handle')
    )
    OR chat_id = 'lindiwe'
  )
);

-- 3c. Message Deletion
DROP POLICY IF EXISTS "Users delete own messages" ON public.messages;
CREATE POLICY "Users delete own messages"
ON public.messages FOR DELETE
USING (
  sender_handle = (auth.jwt() -> 'user_metadata' ->> 'handle')
);

-- 3d. User Profile View (Privacy and PeerID)
DROP VIEW IF EXISTS public.users_public;
CREATE VIEW public.users_public AS
SELECT 
  id, user_id, created_at, handle, name, about,
  profile_pic, is_verified, is_online, last_seen,
  onesignal_id, business_name, stats,
  CASE WHEN (auth.uid() IS NOT NULL) THEN peer_id ELSE NULL END as peer_id
FROM public.users;

-- 4. Performance Tuning (Indices)
-- ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_read_receipts ON public.messages(chat_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_stokvel_lookup ON public.stokvel_contributions(chat_id, user_handle);

-- ═══════════════════════════════════════════════════
-- SYNC COMPLETE
-- ═══════════════════════════════════════════════════
