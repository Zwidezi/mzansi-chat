-- MzansiChat Status Update Migration (Status Stories)

-- 1. Create the statuses table
CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_handle VARCHAR NOT NULL,
    media_url TEXT NOT NULL,
    media_type VARCHAR NOT NULL DEFAULT 'image', -- 'image' or 'video'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '24 hours') NOT NULL
);

-- 2. Prevent RLS locks from blocking inserts
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone can view active statuses
CREATE POLICY "Anyone can view statuses"
ON public.statuses FOR SELECT
USING ( expires_at > timezone('utc'::text, now()) );

-- 4. Policy: Users can insert their own status
CREATE POLICY "Users can insert their own status"
ON public.statuses FOR INSERT
WITH CHECK ( true ); -- We leave it open to authenticated/anon since MzansiChat manages custom handles

-- 5. Set up the Realtime broadcast for statuses (Optional but good for live sync)
alter publication supabase_realtime add table public.statuses;
