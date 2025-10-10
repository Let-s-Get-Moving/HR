# Testing RBAC User Role

## Quick Start

### 1. Create Test User
```bash
cd api
node create-test-user.cjs
```

Creates user:
- **Username:** `testuser`
- **Password:** `password123`
- **Role:** `user` (limited access)

### 2. Link to Employee (Optional)
```bash
cd api
node link-test-user-to-employee.cjs
```

This links testuser to an actual employee so you can see real data.

### 3. Test the User Role

**Log in as testuser:**
1. Logout from current account
2. Login with `testuser` / `password123`
3. Navigate around and see what's restricted

**What you should see:**
- ✅ Can access: Time Tracking, Leave Management, Payroll, Bonuses, Settings
- ✅ Only see own data (the linked employee's data)
- ❌ Cannot approve leave requests (403 error)
- ❌ Cannot see other employees' data

**What to test:**
1. **Time Tracking** - Should only show linked employee's timecards
2. **Leave Management** - Create a request (forced to Pending), try to approve it (should fail)
3. **Payroll** - Should only see linked employee's payroll
4. **Try accessing another employee's data via URL** - Should get 403

### 4. Switch Back to Manager

Logout and login as:
- **Username:** `Avneet`
- **Password:** `password123`
- **Role:** `manager` (full access)

You should now see ALL data again.

## Manual SQL Commands

### Create user manually:
```sql
-- Get user role ID
SELECT id FROM hr_roles WHERE role_name = 'user';

-- Create user (replace $HASH with bcrypt hash of password)
INSERT INTO users (email, full_name, username, role_id, password_hash, is_active)
VALUES ('testuser@hr.local', 'Test User', 'testuser', 423, '$HASH', true);
```

### Link user to employee:
```sql
-- Add column if needed
ALTER TABLE users ADD COLUMN employee_id INTEGER REFERENCES employees(id);

-- Link user to employee
UPDATE users SET employee_id = 5 WHERE username = 'testuser';
```

### Check user's role:
```sql
SELECT u.username, r.role_name, r.permissions->>'scope' as scope
FROM users u
LEFT JOIN hr_roles r ON u.role_id = r.id
WHERE u.username = 'testuser';
```

### Delete test user:
```sql
DELETE FROM users WHERE username = 'testuser';
```

## Troubleshooting

**Q: Test user sees no data**
A: Normal - they need to be linked to an employee. Run `link-test-user-to-employee.cjs`

**Q: Test user can see all data**
A: Check the role is correct:
```sql
SELECT u.username, r.role_name FROM users u 
LEFT JOIN hr_roles r ON u.role_id = r.id 
WHERE u.username = 'testuser';
```

**Q: Getting "employee_id does not exist" error**
A: The link script will create the column automatically, or run:
```sql
ALTER TABLE users ADD COLUMN employee_id INTEGER REFERENCES employees(id);
```

**Q: Want to test with multiple user accounts**
A: Modify `create-test-user.cjs` and change username to `testuser2`, etc.

