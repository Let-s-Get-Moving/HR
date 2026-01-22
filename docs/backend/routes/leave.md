# Leave API

> **Source**: `api/src/routes/leave.js`

Leave balances, calendar, and configuration.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/leave/balances | Get leave balances | Required | All (scoped) |
| GET | /api/leave/balances/:employee_id | Get employee balance | Required | All |
| GET | /api/leave/calendar | Get leave calendar | Required | All (scoped) |
| GET | /api/leave/types | List leave types | Required | All |
| GET | /api/leave/policies | List leave policies | Required | Manager+ |
| PUT | /api/leave/policies/:id | Update leave policy | Required | Manager+ |

## RBAC Scope

- **Admin/Manager**: See all balances and calendar
- **User**: See only their own balance and approved leave

## GET /api/leave/balances

Get leave balances for current year.

**Response:**
```json
[
  {
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "vacation_balance": 15,
    "vacation_used": 5,
    "sick_balance": 10,
    "sick_used": 2,
    "personal_balance": 3,
    "personal_used": 0
  }
]
```

## GET /api/leave/calendar

Get approved leave for calendar display.

**Query Parameters:**
- `start_date` - Calendar start date
- `end_date` - Calendar end date

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "employee_name": "John Doe",
    "leave_type": "Vacation",
    "start_date": "2025-10-15",
    "end_date": "2025-10-20",
    "status": "Approved"
  }
]
```

## GET /api/leave/types

List available leave types.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Vacation",
    "description": "Annual vacation leave",
    "default_days": 15,
    "is_paid": true
  },
  {
    "id": 2,
    "name": "Sick Leave",
    "description": "Sick days",
    "default_days": 10,
    "is_paid": true
  }
]
```

## Database Tables

- `leave_types` - Leave type definitions
- `leave_balances` - Employee balances by year
- `leave_policies` - Policy configurations
- `leave_requests` - Request records (see leave-requests.md)

## Related

- [Leave Requests API](./leave-requests.md) - Request submission and approval

## Examples

```bash
# Get balances
curl -X GET http://localhost:8080/api/leave/balances \
  -H "Cookie: session_id=..."

# Get calendar
curl -X GET "http://localhost:8080/api/leave/calendar?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
