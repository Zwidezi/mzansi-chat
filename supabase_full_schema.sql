-- ═══════════════════════════════════════════════════
-- MzansiChat Full Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  about TEXT DEFAULT 'I''m on MzansiChat!',
  profile_pic TEXT,
  recovery_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  business_name TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- 2. COMMUNITIES TABLE
CREATE TABLE IF NOT EXISTS communities (
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

-- 3. COMMUNITY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_handle TEXT NOT NULL,
  UNIQUE(community_id, user_handle)
);

-- 4. CHATS TABLE (for DMs and group threads)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CHAT PARTICIPANTS
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_handle TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_handle)
);

-- 6. UPDATE MESSAGES TABLE (already exists, add indexes)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ═══════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY (open for now, tighten later)
-- ═══════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users" ON users FOR UPDATE USING (true);

CREATE POLICY "Public read communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Public insert communities" ON communities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update communities" ON communities FOR UPDATE USING (true);

CREATE POLICY "Public read community_members" ON community_members FOR SELECT USING (true);
CREATE POLICY "Public insert community_members" ON community_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read chats" ON chats FOR SELECT USING (true);
CREATE POLICY "Public insert chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update chats" ON chats FOR UPDATE USING (true);

CREATE POLICY "Public read chat_participants" ON chat_participants FOR SELECT USING (true);
CREATE POLICY "Public insert chat_participants" ON chat_participants FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════
-- SEED COMMUNITIES (makes the app feel alive!)
-- ═══════════════════════════════════════════════════
INSERT INTO communities (name, description, member_count, tag, is_promoted, is_verified, image_url) VALUES
  ('Shoprite Specials', 'Real-time grocery specials and savings across SA stores.', 192500, 'promoted', true, true, NULL),
  ('Soweto Job Seekers', 'Daily job alerts, CV tips, and career opportunities for Soweto and Gauteng.', 85300, 'verified', false, true, NULL),
  ('Jozi Tech Hub', 'Network with developers, designers and tech entrepreneurs in Johannesburg.', 12400, 'active', false, false, NULL),
  ('Cape Town Hustle', 'Side hustles, freelance gigs, and entrepreneurship in the Mother City.', 45200, 'active', false, false, NULL),
  ('Durban Eats', 'Best bunny chows, street food, and restaurant deals in eThekwini.', 31800, 'promoted', true, false, NULL),
  ('SA Forex & Crypto', 'Trading signals, tips, and financial literacy for South Africans.', 67100, 'active', false, false, NULL),
  ('Mzansi Memes', 'The funniest South African memes and content. No cap.', 203400, 'active', false, false, NULL),
  ('Township Entrepreneurs', 'Support local business owners. From spaza shops to e-commerce.', 38900, 'verified', false, true, NULL);
