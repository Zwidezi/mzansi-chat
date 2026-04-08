-- ═══════════════════════════════════════════════════
-- MZANSICHAT: CONSOLIDATED PRODUCTION READINESS
-- ═══════════════════════════════════════════════════

-- 1. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_handle TEXT NOT NULL,
    referee_handle TEXT UNIQUE, -- The handle of the person who joined
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link public.users to auth.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);

-- 3. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 4. Helper function: get current user handle
CREATE OR REPLACE FUNCTION public.get_my_handle()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5. RLS POLICIES

-- USERS
DROP POLICY IF EXISTS "Anyone can read user profiles" ON public.users;
CREATE POLICY "Anyone can read user profiles" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (user_id = auth.uid());

-- MESSAGES
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users insert own messages" ON public.messages;
CREATE POLICY "Authenticated users insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND sender_handle = public.get_my_handle());

-- REFERRALS
DROP POLICY IF EXISTS "Anyone can insert a referral" ON public.referrals;
CREATE POLICY "Anyone can insert a referral" ON public.referrals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (referrer_handle = public.get_my_handle());

-- STATUSES
DROP POLICY IF EXISTS "Anyone can read statuses" ON public.statuses;
CREATE POLICY "Anyone can read statuses" ON public.statuses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own statuses" ON public.statuses;
CREATE POLICY "Users insert own statuses" ON public.statuses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_handle = public.get_my_handle());

-- STORAGE
DROP POLICY IF EXISTS "Authenticated media uploads" ON storage.objects;
CREATE POLICY "Authenticated media uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mzansichat_media' AND auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════
-- DONE: Application is now hardened and referrals are live!
-- ═══════════════════════════════════════════════════
