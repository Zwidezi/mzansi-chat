-- ═══════════════════════════════════════════════════
-- MZANSICHAT: STATUS UPGRADE — Captions + Audio
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Add caption field for text overlays
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add audio_url for background sound/music
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add bg_color for text-only statuses (gradient backgrounds)
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT 'gradient-1';

-- Make media_url nullable (text-only statuses won't have media)
ALTER TABLE public.statuses ALTER COLUMN media_url DROP NOT NULL;

-- ═══════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'statuses';
