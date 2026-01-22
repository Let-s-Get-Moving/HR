# useUserRole Hook

> **Source**: `web/src/hooks/useUserRole.js`

Hook and utilities for role-based access control in the frontend.

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `useUserRole` | Hook | Get current user's role |
| `canAccessPage` | Function | Check page access |
| `canAccessBonuses` | Function | Check bonuses access |

## useUserRole()

Hook to get current user's role:

```jsx
import { useUserRole } from '../hooks/useUserRole.js';

function MyComponent() {
  const { userRole, salesRole } = useUserRole();
  
  // userRole: 'admin' | 'manager' | 'user' | null
  // salesRole: 'agent' | 'manager' | null
  
  if (userRole === 'admin') {
    // Show admin-only content
  }
}
```

## canAccessPage(userRole, salesRole, pageKey)

Check if user can access a specific page:

```javascript
import { canAccessPage } from '../hooks/useUserRole.js';

const allowed = canAccessPage('user', null, 'employees');
// false - users can't access employees page

const allowed2 = canAccessPage('manager', null, 'employees');
// true - managers can access employees page
```

### Page Access Matrix

| Page | Admin | Manager | User |
|------|-------|---------|------|
| dashboard | Yes | Yes | Yes |
| employees | Yes | Yes | No |
| timeTracking | Yes | Yes | Yes |
| leave | Yes | Yes | Yes |
| payroll | Yes | Yes | View own |
| compliance | Yes | Yes | No |
| bonuses | Yes | Yes | Sales only |
| messages | Yes | Yes | Yes |
| settings | Yes | Yes | Yes |

## canAccessBonuses(userRole, salesRole)

Check if user can access bonuses/commissions page:

```javascript
const allowed = canAccessBonuses('user', 'agent');
// true - sales agents can see commissions

const allowed2 = canAccessBonuses('user', null);
// false - non-sales users can't see bonuses
```

## Usage in App.jsx

```jsx
const allowedPages = useMemo(() => {
  return Object.fromEntries(
    Object.entries(pages).filter(([key]) => 
      canAccessPage(userRole, salesRole, key)
    )
  );
}, [userRole, salesRole]);
```

## Role Values

| Role | Description |
|------|-------------|
| `admin` | Full access |
| `manager` | Full access, can approve |
| `user` | Limited to own data |

## Sales Roles

| Sales Role | Access |
|------------|--------|
| `agent` | View own commissions |
| `manager` | View team commissions |
| `international_closer` | View specific commission data |

---

*Last verified: January 2026*
