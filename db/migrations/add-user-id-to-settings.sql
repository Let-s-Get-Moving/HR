-- Add user_id column to application_settings for per-user settings
-- This allows each user to have their own preferences, notifications, etc.

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='application_settings' AND column_name='user_id') THEN
        ALTER TABLE application_settings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        COMMENT ON COLUMN application_settings.user_id IS 'User ID for per-user settings. NULL for system-wide settings.';
    END IF;
END $$;

-- Drop the old unique constraint on key (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'application_settings_key_key'
    ) THEN
        ALTER TABLE application_settings DROP CONSTRAINT application_settings_key_key;
    END IF;
END $$;

-- Create new unique constraint: (key, user_id) for user-specific settings
-- This allows same key for different users, but unique per user
-- For system settings (user_id IS NULL), key must be unique
-- Use a partial unique index for NULL user_id (system settings)
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_settings_system_unique 
ON application_settings(key) 
WHERE user_id IS NULL;

-- Use a unique constraint on (key, user_id) for user-specific settings
-- This allows multiple users to have the same key, but each user can only have one value per key
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_settings_user_unique 
ON application_settings(key, user_id) 
WHERE user_id IS NOT NULL;

-- Create index for faster user-specific lookups
CREATE INDEX IF NOT EXISTS idx_application_settings_user_id 
ON application_settings(user_id) 
WHERE user_id IS NOT NULL;

-- Create index for system settings (user_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_application_settings_system 
ON application_settings(category) 
WHERE user_id IS NULL;

COMMENT ON INDEX idx_application_settings_system_unique IS 'Unique constraint for system settings (user_id IS NULL) - ensures each system key is unique';
COMMENT ON INDEX idx_application_settings_user_unique IS 'Unique constraint for user settings (key, user_id) - allows same key for different users';
COMMENT ON INDEX idx_application_settings_user_id IS 'Index for faster lookups of user-specific settings';
COMMENT ON INDEX idx_application_settings_system IS 'Index for system-wide settings (user_id IS NULL)';

