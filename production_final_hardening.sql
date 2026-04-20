-- ═══════════════════════════════════════════════════
-- MZANSICHAT: PRODUCTION FINAL HARDENING (AUDITED & SELF-HEALING)
-- Run this in Supabase SQL Editor
-- Date: 2026-04-20
-- ═══════════════════════════════════════════════════

-- 0. Prerequisites: Ensure columns and tables exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS peer_id TEXT;

CREATE TABLE IF NOT EXISTS public.stokvel_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id TEXT NOT NULL,
    user_handle TEXT NOT NULL REFERENCES public.users(handle) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_reference TEXT
);

-- 1. Hardening Stokvel Contributions
-- Add constraint safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_payment_ref'
    ) THEN
        ALTER TABLE public.stokvel_contributions 
        ADD CONSTRAINT unique_payment_ref UNIQUE (payment_reference);
    END IF;
END $$;

REVOKE ALL ON public.stokvel_contributions FROM anon;
GRANT SELECT, INSERT ON public.stokvel_contributions TO authenticated;
GRANT SELECT ON public.stokvel_contributions TO anon; 

-- 2. Hardening Message Privacy (DMs)
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

-- 3. Message Deletion Policy
DROP POLICY IF EXISTS "Users delete own messages" ON public.messages;
CREATE POLICY "Users delete own messages"
ON public.messages FOR DELETE
USING (
  sender_handle = (auth.jwt() -> 'user_metadata' ->> 'handle')
);

-- 4. PeerID Privacy (Audited Columns)
DROP VIEW IF EXISTS public.users_public;
CREATE VIEW public.users_public AS
SELECT 
  id, user_id, created_at, handle, name, about,
  profile_pic, is_verified, is_online, last_seen,
  onesignal_id, business_name, stats,
  CASE WHEN (auth.uid() IS NOT NULL) THEN peer_id ELSE NULL END as peer_id
FROM public.users;

-- 5. Final Audit / Indices
CREATE INDEX IF NOT EXISTS idx_messages_read_receipts ON public.messages(chat_id, is_read) WHERE is_read = false;

-- Add index for stokvel performance if missing
CREATE INDEX IF NOT EXISTS idx_stokvel_lookup ON public.stokvel_contributions(chat_id, user_handle);

-- ═══════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stokvel_contributions';
-- SELECT COUNT(*) FROM public.users_public;
