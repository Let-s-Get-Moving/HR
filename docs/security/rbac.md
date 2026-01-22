# Role-Based Access Control (RBAC)

> **Source**: `api/src/middleware/rbac.js`, `db/init/025_multi_user_rbac.sql`

This document covers the role-based access control system.

## Overview

The system has three roles with different access levels:

| Role | Scope | Description |
|------|-------|-------------|
| Admin | all | Full system access, can manage users |
| Manager | all | Full access, can approve requests |
| User | own | Limited to viewing/editing own data |

## Database Schema

### hr_roles Table

```sql
CREATE TABLE hr_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    permissions JSONB,
    scope VARCHAR(20) DEFAULT 'own'
);

INSERT INTO hr_roles (role_name, display_name, description, scope) VALUES
('admin', 'Administrator', 'Full system access', 'all'),
('manager', 'Manager', 'Full system access, can approve requests', 'all'),
('user', 'User', 'Limited access - own data only', 'own');
```

### User-Role Association

Users have a `role_id` foreign key:

```sql
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES hr_roles(id);
```

## Role Permissions

### Admin

Full access to everything:
- View/edit all employees
- Manage all payroll
- Approve/reject requests
- System settings
- User management

### Manager

Full access except user management:
- View/edit all employees
- Manage all payroll
- Approve/reject leave requests
- View reports and analytics

### User

Limited to own data:
- View own profile
- View own timecards
- Submit leave requests (cannot approve)
- View own payroll
- View own bonuses/commissions

## Middleware Implementation

### applyScopeFilter

Attaches role info to request:

```javascript
export async function applyScopeFilter(req, res, next) {
  const userId = req.user?.id;
  
  if (!userId) {
    return next();
  }
  
  const roleInfo = await getUserRole(userId);
  
  req.userRole = roleInfo.role_name;
  req.userScope = roleInfo.scope;
  req.employeeId = roleInfo.employee_id;
  
  next();
}
```

### requirePermission

Checks specific permission:

```javascript
export function requirePermission(permission) {
  return async (req, res, next) => {
    const { userRole } = req;
    
    // Admin and Manager have all permissions
    if (userRole === 'admin' || userRole === 'manager') {
      return next();
    }
    
    // Check specific permission for user role
    const allowed = checkPermission(userRole, permission);
    
    if (!allowed) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    next();
  };
}
```

### requireRole

Requires specific role(s):

```javascript
export function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}
```

## Usage in Routes

### Scope-Based Filtering

Routes filter data based on user scope:

```javascript
// In leave.js
router.get('/requests', applyScopeFilter, async (req, res) => {
  let query = 'SELECT * FROM leave_requests';
  let params = [];
  
  // User role: only show own requests
  if (req.userScope === 'own') {
    query += ' WHERE employee_id = $1';
    params.push(req.employeeId);
  }
  
  const { rows } = await q(query, params);
  res.json(rows);
});
```

### Permission-Based Access

Routes require specific permissions:

```javascript
// Only managers/admins can approve
router.put('/requests/:id/status', 
  requirePermission('leave.approve'),
  async (req, res) => {
    // Approve/reject logic
  }
);
```

### Role-Based Access

Routes require specific roles:

```javascript
// Only admins can manage users
router.post('/users',
  requireRole(['admin']),
  async (req, res) => {
    // Create user logic
  }
);
```

## Frontend Integration

### useUserRole Hook

```javascript
// web/src/hooks/useUserRole.js
export function useUserRole() {
  const user = useUser();
  return user?.role || null;
}

export function canAccessPage(userRole, salesRole, pageKey) {
  // Admin/Manager: all pages
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  
  // User: limited pages
  const userAllowedPages = [
    'dashboard',
    'timeTracking',
    'leave',
    'settings'
  ];
  
  return userAllowedPages.includes(pageKey);
}
```

### Conditional Rendering

```jsx
// In App.jsx
const allowedPages = useMemo(() => {
  return Object.fromEntries(
    Object.entries(pages).filter(([key]) => 
      canAccessPage(userRole, salesRole, key)
    )
  );
}, [userRole, salesRole]);
```

## Page Access by Role

| Page | Admin | Manager | User |
|------|-------|---------|------|
| Dashboard | Yes | Yes | Yes |
| Employees | Yes | Yes | No |
| Time Tracking | Yes | Yes | Yes |
| Leave Management | Yes | Yes | Yes |
| Payroll | Yes | Yes | View only |
| Compliance | Yes | Yes | No |
| Bonuses & Commissions | Yes | Yes | View own |
| Messages | Yes | Yes | Yes |
| Settings | Yes | Yes | Yes |

## Data Access by Role

| Data | Admin | Manager | User |
|------|-------|---------|------|
| All employees | Yes | Yes | No |
| Own profile | Yes | Yes | Yes |
| All timecards | Yes | Yes | No |
| Own timecards | Yes | Yes | Yes |
| All leave requests | Yes | Yes | No |
| Own leave requests | Yes | Yes | Yes |
| Approve leave | Yes | Yes | No |
| All payroll | Yes | Yes | No |
| Own payroll | Yes | Yes | Yes |
| System settings | Yes | No | No |
| User management | Yes | No | No |

## Adding New Permissions

1. Define permission in `rbac.js`:

```javascript
export const PERMISSIONS = {
  // ...existing
  WIDGETS_VIEW: 'widgets.view',
  WIDGETS_CREATE: 'widgets.create',
};
```

2. Update role permissions in database:

```sql
UPDATE hr_roles 
SET permissions = permissions || '{"widgets": ["view", "create"]}'
WHERE role_name = 'admin';
```

3. Use in routes:

```javascript
router.post('/widgets',
  requirePermission(PERMISSIONS.WIDGETS_CREATE),
  createWidget
);
```

## Troubleshooting

### User can't access expected page

1. Check user's role in database
2. Verify role has required permission
3. Check frontend `canAccessPage` logic

### Permission denied on API

1. Check `requireAuth` is applied
2. Check `applyScopeFilter` is applied
3. Check `requirePermission` allows the role
4. Verify user's `role_id` in database

### Data scope not applied

1. Verify `applyScopeFilter` middleware is applied
2. Check `req.userScope` is being used in query
3. Verify user has `employee_id` linked

---

*Last verified: January 2026*
