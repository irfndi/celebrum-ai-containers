-- Migration: Add user username history table for tracking username changes
-- This table tracks all username changes for security and auditing purposes

CREATE TABLE IF NOT EXISTS user_username_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  username TEXT, -- Can be null if user had no username
  changed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  change_source TEXT NOT NULL DEFAULT 'telegram_update' CHECK (change_source IN ('telegram_update', 'manual_correction', 'system_migration')),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_username_history_user_id ON user_username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_username_history_telegram_id ON user_username_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_username_history_changed_at ON user_username_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_username_history_telegram_changed ON user_username_history(telegram_id, changed_at DESC);

-- Migrate existing usernames to history table
-- This will create initial entries for all existing users with their current usernames
INSERT INTO user_username_history (user_id, telegram_id, username, changed_at, change_source)
SELECT 
  id,
  telegram_id,
  username,
  created_at, -- Use creation time as the initial change time
  'system_migration'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_username_history 
  WHERE user_username_history.user_id = users.id
);