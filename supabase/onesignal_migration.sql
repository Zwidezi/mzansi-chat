-- Add OneSignal ID column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_onesignal ON users(onesignal_id) WHERE onesignal_id IS NOT NULL;

-- Create a function to store/update user's OneSignal ID
CREATE OR REPLACE FUNCTION update_onesignal_id(user_handle TEXT, onesignal_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET onesignal_id = update_onesignal_id.onesignal_id
  FROM (SELECT user_handle, onesignal_id) AS update_onesignal_id
  WHERE users.handle = update_onesignal_id.user_handle;
END;
$$;