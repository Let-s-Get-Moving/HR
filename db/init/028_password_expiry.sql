-- Password Expiry and Management System
-- Adds password tracking and expiry enforcement

-- Add password tracking columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]'::jsonb;

-- Initialize password_changed_at for existing users
UPDATE users 
SET password_changed_at = COALESCE(updated_at, created_at, NOW())
WHERE password_changed_at IS NULL;

-- Calculate initial expiry (90 days from password change date)
UPDATE users 
SET password_expires_at = password_changed_at + INTERVAL '90 days'
WHERE password_expires_at IS NULL;

-- Create function to automatically update password expiry when password changes
CREATE OR REPLACE FUNCTION update_password_expiry()
RETURNS TRIGGER AS $$
DECLARE
  expiry_days INTEGER := 90; -- Default, can be made dynamic from settings
BEGIN
  -- Check if password_hash changed
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    -- Update password metadata
    NEW.password_changed_at = NOW();
    NEW.password_expires_at = NOW() + (expiry_days || ' days')::INTERVAL;
    NEW.must_change_password = FALSE;
    
    -- Store old password hash in history (for password reuse prevention)
    NEW.password_history = COALESCE(OLD.password_history, '[]'::jsonb) || 
                          jsonb_build_object(
                            'hash', OLD.password_hash,
                            'changed_at', OLD.password_changed_at
                          );
    
    -- Keep only last 5 passwords in history
    IF jsonb_array_length(NEW.password_history) > 5 THEN
      NEW.password_history = NEW.password_history - 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic password expiry updates
DROP TRIGGER IF EXISTS password_expiry_trigger ON users;
CREATE TRIGGER password_expiry_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_password_expiry();

-- Create index for password expiry checks (performance optimization)
CREATE INDEX IF NOT EXISTS idx_users_password_expires_at 
  ON users(password_expires_at) 
  WHERE is_active = true;

-- Create view for password status monitoring
CREATE OR REPLACE VIEW user_password_status AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.password_changed_at,
  u.password_expires_at,
  u.must_change_password,
  CASE 
    WHEN u.must_change_password THEN 'MUST_CHANGE'
    WHEN u.password_expires_at < NOW() THEN 'EXPIRED'
    WHEN u.password_expires_at < NOW() + INTERVAL '10 days' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END as password_status,
  EXTRACT(DAY FROM (u.password_expires_at - NOW())) as days_until_expiry,
  EXTRACT(DAY FROM (NOW() - u.password_changed_at)) as password_age_days
FROM users u
WHERE u.is_active = true;

-- Create function to force password change for a user (admin feature)
CREATE OR REPLACE FUNCTION force_password_change(user_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET must_change_password = TRUE,
      password_expires_at = NOW() -- Expire immediately
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON user_password_status TO hr;

COMMENT ON COLUMN users.password_changed_at IS 'Timestamp when password was last changed';
COMMENT ON COLUMN users.password_expires_at IS 'Timestamp when password expires (calculated from password_changed_at + expiry_days)';
COMMENT ON COLUMN users.must_change_password IS 'Force user to change password on next login (admin-initiated)';
COMMENT ON COLUMN users.password_history IS 'History of previous password hashes (last 5) to prevent reuse';
COMMENT ON VIEW user_password_status IS 'Real-time password expiry status for all active users';
COMMENT ON FUNCTION force_password_change IS 'Admin function to force a user to change their password on next login';

