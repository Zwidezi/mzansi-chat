-- ═══════════════════════════════════════
-- MzansiChat: PRODUCTION CONSOLIDATED FIX
-- ═══════════════════════════════════════

-- A. Resilient VoIP Support
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS peer_id TEXT;

-- Update the secure view to include the new column
CREATE OR REPLACE VIEW public.users_public AS
SELECT id, user_id, handle, name, about, profile_pic, is_verified, is_online, last_seen, onesignal_id, peer_id
FROM public.users;

-- B. Hyper-Resilient RLS handshakes for Messages
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;

-- Robust SELECT policy (handles brand-new users with zero lag)
CREATE POLICY "Users read own conversations"
ON public.messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    chat_id = (auth.jwt() -> 'user_metadata' ->> 'handle')
    OR chat_id LIKE (auth.jwt() -> 'user_metadata' ->> 'handle' || '_%') 
    OR chat_id LIKE ('%_' || auth.jwt() -> 'user_metadata' ->> 'handle')
    OR EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id::text = chat_id 
      AND user_handle = (auth.jwt() -> 'user_metadata' ->> 'handle')
    )
    OR chat_id = 'lindiwe'
    -- Database Fallback
    OR chat_id = public.get_my_handle()
    OR chat_id LIKE (public.get_my_handle() || '_%') 
    OR chat_id LIKE ('%_' || public.get_my_handle())
  )
);

-- Robust INSERT policy
CREATE POLICY "Users send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    sender_handle = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'handle'),
      public.get_my_handle()
    )
  )
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
