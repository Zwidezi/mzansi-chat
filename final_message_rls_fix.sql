-- 1. Drop the old restrictive policies
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
DROP POLICY IF EXISTS "Users read own conversations" ON public.messages;

-- 2. Create a hyper-resilient SELECT policy
CREATE POLICY "Users read own conversations"
ON public.messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Strategy A: Check JWT metadata (Fastest)
    chat_id = (auth.jwt() -> 'user_metadata' ->> 'handle')
    OR chat_id LIKE (auth.jwt() -> 'user_metadata' ->> 'handle' || '_%') 
    OR chat_id LIKE ('%_' || auth.jwt() -> 'user_metadata' ->> 'handle')
    OR EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id::text = chat_id 
      AND user_handle = (auth.jwt() -> 'user_metadata' ->> 'handle')
    )
    OR chat_id = 'lindiwe'
    -- Strategy B: Check database profile (Secondary fallback)
    OR chat_id = public.get_my_handle()
    OR chat_id LIKE (public.get_my_handle() || '_%') 
    OR chat_id LIKE ('%_' || public.get_my_handle())
  )
);

-- 3. Create a clean, direct INSERT policy
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

-- 4. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
