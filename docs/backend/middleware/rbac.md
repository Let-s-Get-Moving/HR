# RBAC Middleware

> **Source**: `api/src/middleware/rbac.js`

Role-Based Access Control middleware.

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `ROLES` | Object | Role constants |
| `PERMISSIONS` | Object | Permission constants |
| `getUserRole` | Function | Get user's role from DB |
| `applyScopeFilter` | Middleware | Attach role info to request |
| `requirePermission` | Factory | Check specific permission |
| `requireRole` | Factory | Require specific role(s) |

## ROLES

```javascript
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
};
```

## PERMISSIONS

```javascript
export const PERMISSIONS = {
  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_APPROVE: 'leave.approve',
  TIME_VIEW: 'time.view',
  TIME_CREATE: 'time.create',
  TIME_UPDATE: 'time.update',
  PAYROLL_VIEW: 'payroll.view',
  BONUSES_VIEW: 'bonuses.view',
  COMMISSIONS_VIEW: 'commissions.view',
  SETTINGS_VIEW: 'settings.view'
};
```

## applyScopeFilter

Middleware that attaches role info to request:

```javascript
router.use(applyScopeFilter);

// After middleware runs:
// req.userRole = 'admin' | 'manager' | 'user'
// req.userScope = 'all' | 'own'
// req.employeeId = number | null
```

## requirePermission(permission)

Factory that returns middleware checking for permission:

```javascript
router.put('/approve', 
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  handler
);
```

Returns 403 if user lacks permission.

## requireRole(roles)

Factory that returns middleware requiring specific role(s):

```javascript
router.post('/users',
  requireRole([ROLES.ADMIN]),
  handler
);
```

Returns 403 if user's role not in list.

## Scope-Based Filtering Pattern

```javascript
router.get('/', applyScopeFilter, async (req, res) => {
  let query = 'SELECT * FROM records';
  const params = [];
  
  // User role: filter to own data
  if (req.userScope === 'own') {
    query += ' WHERE employee_id = $1';
    params.push(req.employeeId);
  }
  
  const { rows } = await q(query, params);
  res.json(rows);
});
```

## Related

- [RBAC Documentation](../../security/rbac.md)

---

*Last verified: January 2026*
