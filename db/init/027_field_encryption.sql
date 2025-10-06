-- Field-Level Encryption for Sensitive PII Data
-- Encrypts SSN and bank account information

-- Add encrypted fields to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ssn_hash VARCHAR(64); -- For searching
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_encrypted TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_routing_encrypted TEXT;

-- Add encryption metadata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pii_encryption_version VARCHAR(10) DEFAULT 'v1';

-- Create index on hash for searching
CREATE INDEX IF NOT EXISTS idx_employees_ssn_hash ON employees(ssn_hash);

-- Create audit table for PII access
CREATE TABLE IF NOT EXISTS pii_access_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    field_accessed VARCHAR(50) NOT NULL,
    access_type VARCHAR(20) NOT NULL, -- 'view', 'edit', 'export'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_pii_access_log_employee_id ON pii_access_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_user_id ON pii_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_accessed_at ON pii_access_log(accessed_at);

-- Function to log PII access
CREATE OR REPLACE FUNCTION log_pii_access(
    p_user_id INTEGER,
    p_employee_id INTEGER,
    p_field VARCHAR,
    p_access_type VARCHAR DEFAULT 'view'
) RETURNS void AS $$
BEGIN
    INSERT INTO pii_access_log (user_id, employee_id, field_accessed, access_type)
    VALUES (p_user_id, p_employee_id, p_field, p_access_type);
END;
$$ LANGUAGE plpgsql;

-- Create view for employees with decryption indicator
CREATE OR REPLACE VIEW employee_pii_status AS
SELECT 
    e.id,
    e.first_name,
    e.last_name,
    CASE 
        WHEN e.ssn_encrypted IS NOT NULL THEN true 
        ELSE false 
    END as has_encrypted_ssn,
    CASE 
        WHEN e.bank_account_encrypted IS NOT NULL THEN true 
        ELSE false 
    END as has_encrypted_bank,
    e.pii_encrypted_at,
    e.pii_encryption_version
FROM employees e;

-- Migrate existing SSN data to encrypted (if any exists)
-- This will be handled by application code to ensure proper encryption

COMMENT ON TABLE pii_access_log IS 'Audit log for all PII field access';
COMMENT ON COLUMN employees.ssn_encrypted IS 'AES-256-GCM encrypted SSN';
COMMENT ON COLUMN employees.ssn_hash IS 'SHA-256 hash of SSN for searching';
COMMENT ON COLUMN employees.bank_account_encrypted IS 'AES-256-GCM encrypted bank account';

