-- ═══════════════════════════════════════
-- MzansiChat: Read Receipts Upgrade
-- Adds trackability for read/unread messages
-- ═══════════════════════════════════════

-- 1. Add is_read column to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 2. Create optimized function to mark chat as read
-- This handles RLS by checking conversation membership
CREATE OR REPLACE FUNCTION public.mark_chat_as_read(target_chat_id TEXT, viewer_handle TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.messages
    SET is_read = true
    WHERE chat_id = target_chat_id
    AND sender_handle != viewer_handle
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update SELECT policy to ensure is_read is returned (standard)
-- 4. RPC Permission
GRANT EXECUTE ON FUNCTION public.mark_chat_as_read(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_chat_as_read(TEXT, TEXT) TO anon;
