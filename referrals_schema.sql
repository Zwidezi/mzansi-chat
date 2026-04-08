-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_handle TEXT NOT NULL,
    referee_handle TEXT UNIQUE, -- The handle of the person who joined
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies: 
-- 1. Anyone can insert a referral record (during signup)
CREATE POLICY "Anyone can insert a referral" 
ON public.referrals FOR INSERT 
WITH CHECK (true);

-- 2. Users can view their own referrals (where they are the referrer)
CREATE POLICY "Users can view their own referrals" 
ON public.referrals FOR SELECT 
USING (
    referrer_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid())
);

-- 3. Trigger to track referral on profile creation
-- This is optional if we do it in the app logic, but safer in DB.
-- We'll stay with app logic for now to keep it simple for the refactor.
