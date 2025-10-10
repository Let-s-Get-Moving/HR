-- Simple 3-Role RBAC System
-- Roles: admin, manager, user

-- Clear existing roles and start fresh
TRUNCATE TABLE hr_roles CASCADE;

-- Insert the 3 roles with their permissions
INSERT INTO hr_roles (role_name, display_name, description, permissions) VALUES
('admin', 'Administrator', 'Full system access including user management', 
    '{
      "employees": ["create", "read", "update", "delete"],
      "payroll": ["create", "read", "update", "delete"],
      "timecards": ["create", "read", "update", "delete"],
      "leave": ["create", "read", "update", "delete", "approve"],
      "bonuses": ["create", "read", "update", "delete", "approve"],
      "commissions": ["create", "read", "update", "delete"],
      "recruiting": ["create", "read", "update", "delete"],
      "performance": ["create", "read", "update", "delete"],
      "benefits": ["create", "read", "update", "delete"],
      "analytics": ["read"],
      "reports": ["create", "read", "export"],
      "settings": ["read", "update"],
      "users": ["create", "read", "update", "delete"],
      "system": ["manage"],
      "scope": "all"
    }'::jsonb),
('manager', 'Manager', 'Full system access, same as admin for now', 
    '{
      "employees": ["create", "read", "update", "delete"],
      "payroll": ["create", "read", "update", "delete"],
      "timecards": ["create", "read", "update", "delete"],
      "leave": ["create", "read", "update", "delete", "approve"],
      "bonuses": ["create", "read", "update", "delete", "approve"],
      "commissions": ["create", "read", "update", "delete"],
      "recruiting": ["create", "read", "update", "delete"],
      "performance": ["create", "read", "update", "delete"],
      "benefits": ["create", "read", "update", "delete"],
      "analytics": ["read"],
      "reports": ["create", "read", "export"],
      "settings": ["read", "update"],
      "users": ["create", "read", "update", "delete"],
      "system": ["manage"],
      "scope": "all"
    }'::jsonb),
('user', 'User', 'Limited access - can only view and manage own data', 
    '{
      "timecards": ["create", "read", "update"],
      "leave": ["create", "read"],
      "payroll": ["read"],
      "bonuses": ["read"],
      "commissions": ["read"],
      "settings": ["read"],
      "scope": "own"
    }'::jsonb);

-- Update Avneet to have manager role
UPDATE users 
SET role_id = (SELECT id FROM hr_roles WHERE role_name = 'manager')
WHERE username = 'Avneet' OR email LIKE '%avneet%' OR full_name ILIKE '%avneet%';

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Add helper function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(user_id_param INTEGER, resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
    resource_permissions JSONB;
BEGIN
    -- Get user's role permissions
    SELECT r.permissions INTO user_permissions
    FROM users u
    JOIN hr_roles r ON u.role_id = r.id
    WHERE u.id = user_id_param;
    
    IF user_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get permissions for the specific resource
    resource_permissions := user_permissions -> resource;
    
    IF resource_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if the action is allowed
    RETURN resource_permissions ? action;
END;
$$ LANGUAGE plpgsql;

-- Add helper function to get user's data scope
CREATE OR REPLACE FUNCTION get_user_scope(user_id_param INTEGER)
RETURNS TEXT AS $$
DECLARE
    user_scope TEXT;
BEGIN
    SELECT r.permissions->>'scope' INTO user_scope
    FROM users u
    JOIN hr_roles r ON u.role_id = r.id
    WHERE u.id = user_id_param;
    
    RETURN COALESCE(user_scope, 'own');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_permission TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_scope TO PUBLIC;

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'RBAC roles updated successfully';
    RAISE NOTICE 'Roles: admin (full access), manager (full access), user (limited to own data)';
END $$;

