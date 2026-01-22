# Users API

> **Source**: `api/src/routes/users.js`

User account management.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/users | List users | Required | Admin |
| GET | /api/users/:id | Get user | Required | Admin |
| POST | /api/users | Create user | Required | Admin |
| PUT | /api/users/:id | Update user | Required | Admin |
| DELETE | /api/users/:id | Delete user | Required | Admin |
| POST | /api/users/:id/reset-password | Reset password | Required | Admin |

## GET /api/users

List all user accounts.

**Response:**
```json
[
  {
    "id": 1,
    "username": "Avneet",
    "email": "admin@hrsystem.com",
    "role": "Manager",
    "employee_id": 123,
    "mfa_enabled": true,
    "last_login": "2025-10-20T10:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

## POST /api/users

Create a new user account.

**Request:**
```json
{
  "username": "john.doe",
  "email": "john@company.com",
  "password": "initial-password",
  "role_id": 3,
  "employee_id": 456
}
```

**Response:**
```json
{
  "id": 5,
  "username": "john.doe",
  "email": "john@company.com",
  "role": "User"
}
```

## PUT /api/users/:id

Update a user account.

**Request:**
```json
{
  "role_id": 2,
  "email": "new-email@company.com"
}
```

## POST /api/users/:id/reset-password

Reset a user's password.

**Request:**
```json
{
  "new_password": "new-password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## User-Employee Linking

Users can be linked to employee records via `employee_id`. This enables:
- RBAC scope filtering (User role sees only their employee data)
- Employee self-service features

## Database Tables

- `users` - User accounts
- `hr_roles` - Role definitions
- `employees` - Linked employee records

## Related

- [Authentication API](./auth-mfa.md)
- [RBAC Documentation](../../security/rbac.md)

## Examples

```bash
# List users (admin only)
curl -X GET http://localhost:8080/api/users \
  -H "Cookie: session_id=..."

# Create user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "username": "john.doe",
    "email": "john@company.com",
    "password": "temp-pass",
    "role_id": 3,
    "employee_id": 456
  }'
```

---

*Last verified: January 2026*
