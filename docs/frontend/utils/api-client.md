# API Client

> **Source**: `web/src/config/api.js`, `web/src/utils/apiClient.ts`

HTTP client for API communication.

## API Function

Main export for making API calls:

```javascript
import { API } from '../config/api.js';

// GET request
const employees = await API('/api/employees');

// POST request
const result = await API('/api/employees', {
  method: 'POST',
  body: JSON.stringify({ first_name: 'John', ... })
});

// With query params
const filtered = await API('/api/employees?status=active');
```

## Configuration

Base URL determined by environment:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

## Default Options

Applied to all requests:
- `credentials: 'include'` - Send cookies
- `headers: { 'Content-Type': 'application/json' }`

## Error Handling

```javascript
try {
  const data = await API('/api/endpoint');
} catch (error) {
  // error.message contains error text
  // error.status contains HTTP status (if available)
}
```

The API function:
1. Makes fetch request
2. Checks response.ok
3. Parses JSON
4. Throws on error

## Session Handling

Session cookie (`session_id`) is automatically:
- Sent with requests (`credentials: 'include'`)
- Managed by browser

If session expires, API returns 401 and frontend should redirect to login.

## File Upload

For file uploads, use FormData:

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const result = await fetch(`${API_URL}/api/imports/upload`, {
  method: 'POST',
  credentials: 'include',
  body: formData
  // Don't set Content-Type for FormData
});
```

## TypeScript Version

`apiClient.ts` provides typed version:

```typescript
import { apiClient } from '../utils/apiClient';

const employees = await apiClient.get<Employee[]>('/api/employees');
const created = await apiClient.post<Employee>('/api/employees', data);
```

---

*Last verified: January 2026*
