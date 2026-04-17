-- Add peer_id for resilient VoIP connections
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS peer_id TEXT;

-- Update the view to include it
CREATE OR REPLACE VIEW public.users_public AS
SELECT id, user_id, handle, name, about, profile_pic, is_verified, is_online, last_seen, onesignal_id, peer_id
FROM public.users;
