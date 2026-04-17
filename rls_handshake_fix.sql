-- ═══════════════════════════════════════
-- MzansiChat: RLS Handshake Fix (v2)
-- ═══════════════════════════════════════

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users send messages" ON public.messages;

-- 2. Create hyper-robust SELECT policy
-- Note: Supabase JWT stores metadata in 'user_metadata' key, not 'raw_user_meta_data'
CREATE POLICY "Users read own conversations"
ON public.messages FOR SELECT
USING (
  (chat_id LIKE (auth.jwt() -> 'user_metadata' ->> 'handle' || '_%') OR chat_id LIKE ('%_' || auth.jwt() -> 'user_metadata' ->> 'handle'))
  OR EXISTS (
    SELECT 1 FROM public.community_members 
    WHERE community_id::text = chat_id 
    AND user_handle = auth.jwt() -> 'user_metadata' ->> 'handle'
  )
  OR chat_id = 'lindiwe'
);

-- 3. Create hyper-robust INSERT policy
CREATE POLICY "Users send messages"
ON public.messages FOR INSERT
WITH CHECK (
  (sender_handle = auth.jwt() -> 'user_metadata' ->> 'handle')
  AND (
    (chat_id LIKE (sender_handle || '_%') OR chat_id LIKE ('%_' || sender_handle))
    OR EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id::text = chat_id 
      AND user_handle = sender_handle
    )
    OR chat_id = 'lindiwe'
  )
);

-- 4. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
