> **LEGACY DOCUMENT**
> This document is outdated. See [security/rbac.md](./security/rbac.md) for current RBAC documentation.

# RBAC Implementation - 3 Role System

## Overview
Implemented a simplified Role-Based Access Control (RBAC) system with 3 roles: **Admin**, **Manager**, and **User**.

## Roles

### 1. Admin
- **Full system access**
- Can manage all employees, payroll, reports, settings
- Can create/manage other users
- Scope: `all` (can view/edit all data)

### 2. Manager  
- **Full system access** (same as Admin for now)
- Can approve/reject leave requests
- Can view all employee data
- Can process payroll and manage bonuses/commissions
- Scope: `all` (can view/edit all data)

### 3. User
- **Limited access** - own data only
- **Allowed pages**: Time Tracking, Leave Management, Payroll (view), Bonuses & Commissions (view), Settings (view)
- **Leave workflow**: Can submit leave requests → Manager/Admin approves
- **Cannot see**: Other employees' data, hiring, recruiting, admin functions
- Scope: `own` (can only view/edit their own data)

## Database Setup

### Roles Table (`hr_roles`)
```sql
INSERT INTO hr_roles (role_name, display_name, description, permissions) VALUES
('admin', 'Administrator', 'Full system access', {...}),
('manager', 'Manager', 'Full system access', {...}),
('user', 'User', 'Limited - own data only', {...});
```

### Users Table
- `role_id` → foreign key to `hr_roles.id`
- `employee_id` → links user account to employee record (required for `user` role)

### Current Setup
- **Avneet**: Manager role (username: `Avneet`, password: `password123`)

## Backend Implementation

### RBAC Middleware (`api/src/middleware/rbac.js`)

**Key Functions:**
- `getUserRole(userId)` - Gets user's role and scope from database
- `requirePermission(permission)` - Middleware to check if user has specific permission
- `applyScopeFilter` - Middleware that attaches role info to request
- `requireRole(roles)` - Middleware to require specific role(s)

**Permissions:**
```javascript
PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_APPROVE
PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE
PERMISSIONS.PAYROLL_VIEW
PERMISSIONS.BONUSES_VIEW
PERMISSIONS.COMMISSIONS_VIEW
PERMISSIONS.SETTINGS_VIEW
```

### Protected Routes

#### Leave Management (`api/src/routes/leave.js`)
- `GET /api/leave/requests` - Users see only their requests
- `GET /api/leave/balances` - Users see only their balance
- `GET /api/leave/calendar` - Users see only their approved leave
- `POST /api/leave/requests` - Users can only create requests for themselves (forced to `Pending` status)
- `PUT /api/leave/requests/:id/status` - **Only Managers/Admins** can approve/reject

#### Time Tracking (`api/src/routes/timecards.js`)
- `GET /api/timecards` - Users see only their timecards
- Users can create/edit their own timecards

#### Bonuses & Commissions
- `GET /api/bonuses` - Users see only their bonuses
- `GET /api/commissions/monthly` - Users see only their commissions

#### Payroll
- `GET /api/payroll` - Users see only their payroll records

## Frontend Implementation (TODO)

### Role-Based Navigation
```javascript
// Show/hide menu items based on role
{userRole !== 'user' && <NavItem to="/hiring">Hiring</NavItem>}
{userRole !== 'user' && <NavItem to="/employees">Employees</NavItem>}
```

### Page-Level Protection
```javascript
// In each page component
const { userRole } = useAuth();

if (userRole === 'user') {
  // Show limited view
  // Only show own data
}
```

### Leave Management UI
- **Users**: See "Request Leave" form + their leave history
- **Managers**: See all pending requests + approve/reject buttons

## Testing on Render Database

All changes have been applied to the **Render production database**:
```
Host: dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com
Database: hrcore_42l4
```

### Verification Steps:
1. ✅ 3 roles created in `hr_roles` table
2. ✅ Avneet assigned manager role
3. ✅ RBAC middleware updated
4. ✅ Leave, timecard, bonus, commission routes protected
5. ⏳ Frontend UI updates (in progress)

## How It Works

### User Login Flow:
1. User logs in with username/password
2. System looks up user in `users` table
3. Joins with `hr_roles` to get role and permissions
4. Session stores: `userId`, `role`, `scope`, `employeeId`

### Request Authorization:
1. Request hits protected route
2. `applyScopeFilter` middleware runs first
   - Gets user's role from database
   - Attaches `req.userRole`, `req.userScope`, `req.employeeId`
3. `requirePermission` middleware runs
   - Checks if user's role has the required permission
   - Returns 403 if not authorized
4. Route handler runs
   - If `req.userScope === 'own'`, filters queries to `employee_id = req.employeeId`
   - Returns only user's own data

### Leave Request Workflow:
1. **User** creates leave request → Status forced to `Pending`
2. **Manager/Admin** sees pending request
3. **Manager/Admin** approves/rejects → Updates status
4. **User** sees updated status in their leave history

## Security Features
- Users cannot see other employees' data
- Users cannot approve their own leave requests  
- Users cannot edit/delete others' records
- All queries filtered by `employee_id` for user role
- Middleware enforces permissions at API level

## Next Steps
1. Update frontend components to use role-based rendering
2. Add role indicator in UI header
3. Test user experience for each role
4. Document role management (how to assign roles to new users)

## API Examples

### As User Role:
```bash
GET /api/leave/requests
→ Returns only requests where employee_id = user's employee_id

POST /api/leave/requests
→ Can only create request for self, status forced to 'Pending'

PUT /api/leave/requests/123/status  
→ 403 Forbidden (no approval permission)
```

### As Manager/Admin Role:
```bash
GET /api/leave/requests
→ Returns ALL leave requests

PUT /api/leave/requests/123/status
→ Can approve/reject any request
```

## Files Modified
- `/api/src/middleware/rbac.js` - RBAC middleware
- `/api/src/utils/ensureAdminUser.js` - Creates manager user on startup
- `/api/src/routes/leave.js` - Protected with RBAC
- `/api/src/routes/timecards.js` - Protected with RBAC
- `/api/src/routes/bonuses.js` - Added RBAC imports
- `/api/src/routes/commissions.js` - Added RBAC imports
- `/db/migrations/add-simple-rbac-roles.sql` - Database migration

## Database Helper Functions
```sql
has_permission(user_id, resource, action) → boolean
get_user_scope(user_id) → 'all' | 'own'
```

