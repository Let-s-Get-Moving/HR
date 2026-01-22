# Session Manager

> **Source**: `web/src/utils/sessionManager.js`

Client-side session state management.

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `sessionManager` | Object | Session management singleton |

## Methods

### checkSession(API)

Check if current session is valid:

```javascript
import { sessionManager } from '../utils/sessionManager.js';
import { API } from '../config/api.js';

const result = await sessionManager.checkSession(API);

if (result && result.user) {
  // Session valid, user data available
  setUser(result.user);
} else {
  // Session invalid
  setUser(null);
}
```

### clearSession()

Clear local session state:

```javascript
sessionManager.clearSession();
```

### getUser()

Get cached user data:

```javascript
const user = sessionManager.getUser();
```

### setUser(userData)

Cache user data:

```javascript
sessionManager.setUser({ id: 1, username: 'John', ... });
```

## Usage in App.jsx

```jsx
useEffect(() => {
  const checkSession = async () => {
    try {
      const sessionData = await sessionManager.checkSession(API);
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  checkSession();
}, []);
```

## Session Flow

```
App loads
    │
    ▼
checkSession() called
    │
    ▼
GET /api/auth/session
    │
    ├── 200 + user data → Set user state
    │
    └── 401 / error → Clear user state, show login
```

## Related

- [sessionFix.js](./session-fix.md) - Session recovery utilities
- [Authentication API](../../backend/routes/auth-mfa.md)

---

*Last verified: January 2026*
