-- ═══════════════════════════════════════════════════
-- MZANSICHAT: CONSOLIDATED PRODUCTION SCHEMA
-- Generated: 2026-04-08
-- ═══════════════════════════════════════════════════

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  about TEXT DEFAULT 'I''m on MzansiChat!',
  profile_pic TEXT,
  recovery_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  onesignal_id TEXT,
  referral_count INTEGER DEFAULT 0
);

-- 2.1 REFERRAL REWARD TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment referral count for the referrer
    UPDATE public.users 
    SET referral_count = referral_count + 1
    WHERE handle = NEW.referrer_handle;

    -- Automatically verify if they reach 5 referrals
    UPDATE public.users
    SET is_verified = true
    WHERE handle = NEW.referrer_handle AND referral_count >= 5;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Trigger creation might need to be wrapped in a block if applied multiple times
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_referral') THEN
        CREATE TRIGGER on_new_referral
        AFTER INSERT ON public.referrals
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_referral();
    END IF;
END $$;


-- COMMUNITIES
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  tag TEXT DEFAULT 'active',
  is_promoted BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  image_url TEXT,
  owner_handle TEXT
);

-- COMMUNITY MEMBERS
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  user_handle TEXT NOT NULL,
  UNIQUE(community_id, user_handle)
);

-- CHATS (Direct Messages / Group Threads)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- CHAT PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_handle TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_handle)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  chat_id TEXT NOT NULL, -- Flexible ID (handle1_handle2 or community_id)
  sender_handle TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- REFERRALS
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_handle TEXT NOT NULL,
    referee_handle TEXT UNIQUE, 
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STATUSES
CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_handle TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- WEBAUTHN CREDENTIALS
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_handle TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_onesignal ON public.users(onesignal_id) WHERE onesignal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON public.statuses(expires_at);

-- 4. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.get_my_handle()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5. ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- USERS Policies
CREATE POLICY "Anyone can read user profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (user_id = auth.uid());

-- COMMUNITIES Policies
CREATE POLICY "Anyone can read communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Auth users create communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_handle = public.get_my_handle());
CREATE POLICY "Owners update communities" ON public.communities FOR UPDATE USING (owner_handle = public.get_my_handle());

-- COMMUNITY MEMBERS Policies
CREATE POLICY "Anyone can read memberships" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users join communities" ON public.community_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_handle = public.get_my_handle());
CREATE POLICY "Users leave communities" ON public.community_members FOR DELETE USING (user_handle = public.get_my_handle());

-- CHATS Policies
CREATE POLICY "Auth read chats" ON public.chats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MESSAGES Policies (restricted to conversation participants)
CREATE POLICY "Users read own conversations" ON public.messages FOR SELECT USING (
  (chat_id LIKE (public.get_my_handle() || '_%') OR chat_id LIKE ('%_' || public.get_my_handle()))
  OR EXISTS (SELECT 1 FROM public.community_members WHERE community_id::text = chat_id AND user_handle = public.get_my_handle())
  OR chat_id = 'lindiwe'
);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND sender_handle = public.get_my_handle());
CREATE POLICY "Users delete own messages" ON public.messages FOR DELETE USING (sender_handle = public.get_my_handle());

-- REFERRALS Policies
CREATE POLICY "Anyone insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT USING (referrer_handle = public.get_my_handle());

-- STATUSES Policies (require authentication)
CREATE POLICY "Auth users read active statuses" ON public.statuses FOR SELECT USING (auth.uid() IS NOT NULL AND expires_at > NOW());
CREATE POLICY "Users insert own status" ON public.statuses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_handle = public.get_my_handle());

-- 6. SEED DATA (Communities)
INSERT INTO public.communities (name, description, member_count, tag, is_promoted, is_verified) VALUES
  ('Shoprite Specials', 'Real-time grocery specials and savings across SA stores.', 192500, 'promoted', true, true),
  ('Soweto Job Seekers', 'Daily job alerts, CV tips, and career opportunities for Soweto and Gauteng.', 85300, 'verified', false, true),
  ('Jozi Tech Hub', 'Network with developers, designers and tech entrepreneurs in Johannesburg.', 12400, 'active', false, false),
  ('Cape Town Hustle', 'Side hustles, freelance gigs, and entrepreneurship in the Mother City.', 45200, 'active', false, false),
  ('Durban Eats', 'Best bunny chows, street food, and restaurant deals in eThekwini.', 31800, 'promoted', true, false),
  ('SA Forex & Crypto', 'Trading signals, tips, and financial literacy for South Africans.', 67100, 'active', false, false),
  ('Mzansi Memes', 'The funniest South African memes and content. No cap.', 203400, 'active', false, false),
  ('Township Entrepreneurs', 'Support local business owners. From spaza shops to e-commerce.', 38900, 'verified', false, true)
ON CONFLICT (name) DO NOTHING;
