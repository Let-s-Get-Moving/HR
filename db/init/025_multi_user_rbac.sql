-- Multi-User System with Role-Based Access Control (RBAC)
-- For HR-only use case with 3 roles

-- Update users table to support multiple HR users
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create roles table for HR roles
CREATE TABLE IF NOT EXISTS hr_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert HR roles
INSERT INTO hr_roles (role_name, display_name, description, permissions) VALUES
('hr_admin', 'HR Administrator', 'Full system access and user management', 
    '{"users": ["create", "read", "update", "delete"], 
      "employees": ["create", "read", "update", "delete"], 
      "payroll": ["create", "read", "update", "delete"],
      "reports": ["create", "read", "export"],
      "settings": ["read", "update"],
      "system": ["manage"]}'::jsonb),
('hr_manager', 'HR Manager', 'Full data access, can process payroll and manage employees',
    '{"users": ["read"], 
      "employees": ["create", "read", "update"], 
      "payroll": ["create", "read", "update"],
      "reports": ["create", "read", "export"],
      "settings": ["read"]}'::jsonb),
('hr_user', 'HR User', 'Standard HR access, view and edit employee data',
    '{"employees": ["read", "update"], 
      "payroll": ["read"],
      "reports": ["read"]}'::jsonb)
ON CONFLICT (role_name) DO NOTHING;

-- Drop dependent views before changing column
DROP VIEW IF EXISTS user_security_status CASCADE;

-- Update users table to use hr_roles
ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES hr_roles(id);

-- Set default role for existing admin user
UPDATE users 
SET role_id = (SELECT id FROM hr_roles WHERE role_name = 'hr_admin' LIMIT 1)
WHERE role_id IS NULL;

-- Create user_permissions table for granular overrides
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL,
    permission VARCHAR(50) NOT NULL,
    granted BOOLEAN DEFAULT true,
    granted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource, permission)
);

-- Create user_activity_log for tracking actions
CREATE TABLE IF NOT EXISTS user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Function to check user permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id INTEGER,
    p_resource VARCHAR,
    p_permission VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN;
    role_permissions JSONB;
BEGIN
    -- Check if user has explicit permission override
    SELECT granted INTO has_permission
    FROM user_permissions
    WHERE user_id = p_user_id 
      AND resource = p_resource 
      AND permission = p_permission
    LIMIT 1;
    
    IF has_permission IS NOT NULL THEN
        RETURN has_permission;
    END IF;
    
    -- Check role-based permissions
    SELECT r.permissions INTO role_permissions
    FROM users u
    JOIN hr_roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;
    
    IF role_permissions IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if permission exists in role's permissions JSON
    RETURN role_permissions->p_resource ? p_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id INTEGER,
    p_action VARCHAR,
    p_resource VARCHAR DEFAULT NULL,
    p_resource_id INTEGER DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO user_activity_log (user_id, action, resource, resource_id, details)
    VALUES (p_user_id, p_action, p_resource, p_resource_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Create view for user details with role info
CREATE OR REPLACE VIEW user_details AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.first_name,
    u.last_name,
    u.is_active,
    u.last_login,
    u.created_at,
    u.updated_at,
    r.role_name,
    r.display_name as role_display_name,
    r.permissions as role_permissions
FROM users u
LEFT JOIN hr_roles r ON u.role_id = r.id;

COMMENT ON TABLE hr_roles IS 'HR-specific roles for the system';
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides';
COMMENT ON TABLE user_activity_log IS 'Audit log of all user actions';

