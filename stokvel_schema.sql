-- ═══════════════════════════════════════
-- MzansiChat: Stokvel Vault Schema
-- Tracks community savings deposits properly
-- ═══════════════════════════════════════

-- 1. Contributions Table
CREATE TABLE IF NOT EXISTS public.stokvel_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id TEXT NOT NULL,
    user_handle TEXT NOT NULL REFERENCES public.users(handle) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_reference TEXT -- For Paystack linking
);

-- 2. Indexes for fast calculation
CREATE INDEX IF NOT EXISTS idx_stokvel_chat ON public.stokvel_contributions(chat_id);
CREATE INDEX IF NOT EXISTS idx_stokvel_user ON public.stokvel_contributions(user_handle);

-- 3. RLS Policies
ALTER TABLE public.stokvel_contributions ENABLE ROW LEVEL SECURITY;

-- Anyone who is a member of the community can see the contributions
CREATE POLICY "Community members view contributions"
ON public.stokvel_contributions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id::text = chat_id
        AND user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    )
);

-- Any authenticated user can contribute to their communities
CREATE POLICY "Users insert own contributions"
ON public.stokvel_contributions FOR INSERT
WITH CHECK (
    user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id::text = chat_id
        AND user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    )
);

-- 4. RPC Permission
GRANT ALL ON public.stokvel_contributions TO authenticated;
GRANT ALL ON public.stokvel_contributions TO anon;
