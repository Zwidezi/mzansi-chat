-- ═══════════════════════════════════════════════════
-- MZANSICHAT: FINAL PRODUCTION POLISH
-- ═══════════════════════════════════════════════════

-- 1. WEBAUTHN DEVICE PERSISTENCE
-- Allows users to link multiple devices via hardware security.
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_handle TEXT REFERENCES public.users(handle) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for WebAuthn (Simple: Allow lookup by handle)
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read credentials" ON public.webauthn_credentials FOR SELECT USING (true);
CREATE POLICY "Public insert credentials" ON public.webauthn_credentials FOR INSERT WITH CHECK (true);

-- 2. COMMUNITY OWNERSHIP & ADMIN
-- Track who created a community for moderation tools.
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS owner_handle TEXT;
UPDATE public.communities SET owner_handle = 'mzansi_admin' WHERE owner_handle IS NULL;

-- 3. USER METRICS & STATS
-- Track real bandwidth savings (JSONB flexibility)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"data_saved": 0, "calls_made": 0, "messages_sent": 0}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 4. MESSAGE ENHANCEMENTS
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- 5. INDEXING FOR SCALE
CREATE INDEX IF NOT EXISTS idx_webauthn_user ON public.webauthn_credentials(user_handle);
CREATE INDEX IF NOT EXISTS idx_communities_owner ON public.communities(owner_handle);

-- 6. DEFAULT COMMUNITIES (Self-Healing)
INSERT INTO public.communities (id, name, description, tag, member_count, is_promoted, is_verified, owner_handle)
VALUES 
  ('main-square', 'Soweto Main Square', 'Official community chat for news and updates.', 'OFFICIAL', 4200, true, true, 'mzansi_admin'),
  ('taxi-rank', 'Taxi Rank Connect', 'Real-time updates on taxi routes and ranks.', 'TRAVEL', 1250, false, false, 'mzansi_admin')
ON CONFLICT (id) DO NOTHING;
