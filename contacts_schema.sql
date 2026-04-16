-- ═══════════════════════════════════════
-- Contacts / Friends List
-- ═══════════════════════════════════════

-- Create contacts table (mutual friendship model)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_handle TEXT NOT NULL,
    contact_handle TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries
    UNIQUE(user_handle, contact_handle),
    
    -- Validate: can't add yourself
    CHECK(user_handle <> contact_handle)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user_handle ON public.contacts(user_handle);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_handle ON public.contacts(contact_handle);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own contacts
CREATE POLICY "Users can view own contacts"
ON public.contacts FOR SELECT
USING (
    user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid())
);

-- Policy: Users can add contacts for themselves
CREATE POLICY "Users can add own contacts"
ON public.contacts FOR INSERT
WITH CHECK (
    user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid())
);

-- Policy: Users can remove their own contacts
CREATE POLICY "Users can remove own contacts"
ON public.contacts FOR DELETE
USING (
    user_handle = (SELECT handle FROM public.users WHERE user_id = auth.uid())
);