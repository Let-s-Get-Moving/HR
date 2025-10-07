-- Create trusted_devices table for MFA bypass feature
-- Users can trust devices for 7 days (configurable) to skip MFA on login

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  ua_family TEXT,
  os_family TEXT,
  ip_created INET,
  ip_last_used INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_expires ON trusted_devices(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token_hash ON trusted_devices(token_hash);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires_at ON trusted_devices(expires_at) WHERE revoked_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE trusted_devices IS 'Stores trusted devices for MFA bypass (7-day default)';
COMMENT ON COLUMN trusted_devices.token_hash IS 'HMAC-SHA256(TD_PEPPER, device_secret) - never store the secret itself';
COMMENT ON COLUMN trusted_devices.device_label IS 'User-editable device nickname (e.g., "Vlad''s MacBook")';
COMMENT ON COLUMN trusted_devices.ua_family IS 'Browser family for display/risk (e.g., "Chrome")';
COMMENT ON COLUMN trusted_devices.os_family IS 'OS family for display/risk (e.g., "macOS")';
COMMENT ON COLUMN trusted_devices.expires_at IS 'Absolute expiration timestamp (created_at + 7 days by default)';
COMMENT ON COLUMN trusted_devices.rotated_at IS 'Last token rotation timestamp (rotated on each use for replay protection)';
COMMENT ON COLUMN trusted_devices.revoked_by IS 'Who revoked: user|system|admin|password_change|mfa_disable';
