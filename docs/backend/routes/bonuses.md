# Bonuses API

> **Source**: `api/src/routes/bonuses.js`

Bonus management endpoints.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/bonuses | List bonuses | Required | All (scoped) |
| GET | /api/bonuses/:id | Get bonus details | Required | All |
| POST | /api/bonuses | Create bonus | Required | Manager+ |
| PUT | /api/bonuses/:id | Update bonus | Required | Manager+ |
| DELETE | /api/bonuses/:id | Delete bonus | Required | Manager+ |
| PUT | /api/bonuses/:id/approve | Approve bonus | Required | Manager+ |

## RBAC Scope

- **Admin/Manager**: See all bonuses
- **User**: See only their own bonuses

## GET /api/bonuses

List bonuses with optional filters.

**Query Parameters:**
- `employee_id` - Filter by employee
- `status` - Filter by status
- `type` - Filter by bonus type

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "bonus_type": "Performance",
    "amount": 1000.00,
    "reason": "Excellent Q3 performance",
    "status": "Approved",
    "effective_date": "2025-10-01",
    "approved_by": 1,
    "approved_at": "2025-09-28T14:30:00Z"
  }
]
```

## POST /api/bonuses

Create a new bonus.

**Request:**
```json
{
  "employee_id": 123,
  "bonus_type": "Performance",
  "amount": 1000.00,
  "reason": "Excellent Q3 performance",
  "effective_date": "2025-10-01"
}
```

**Response:**
```json
{
  "id": 1,
  "employee_id": 123,
  "bonus_type": "Performance",
  "amount": 1000.00,
  "status": "Pending"
}
```

## PUT /api/bonuses/:id/approve

Approve a pending bonus.

**Request:**
```json
{
  "approved_by": 1
}
```

**Response:**
```json
{
  "id": 1,
  "status": "Approved",
  "approved_by": 1,
  "approved_at": "2025-09-28T14:30:00Z"
}
```

## Database Tables

- `bonuses` - Bonus records

## Examples

```bash
# List bonuses
curl -X GET http://localhost:8080/api/bonuses \
  -H "Cookie: session_id=..."

# Create bonus
curl -X POST http://localhost:8080/api/bonuses \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "employee_id": 123,
    "bonus_type": "Performance",
    "amount": 1000,
    "reason": "Q3 performance"
  }'
```

---

*Last verified: January 2026*
