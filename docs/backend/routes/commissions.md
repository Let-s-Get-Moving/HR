# Commissions API

> **Source**: `api/src/routes/commissions.js`

Commission data management.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/commissions | List commissions | Required | All (scoped) |
| GET | /api/commissions/monthly | List monthly commissions | Required | All (scoped) |
| GET | /api/commissions/periods | List commission periods | Required | All |
| POST | /api/commissions/import | Import commissions | Required | Manager+ |

## RBAC Scope

- **Admin/Manager**: See all commissions
- **User**: See only their own commissions

## GET /api/commissions/monthly

List monthly commission records.

**Query Parameters:**
- `employee_id` - Filter by employee
- `period_start` - Filter by period start
- `period_end` - Filter by period end

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "period_start": "2025-09-01",
    "period_end": "2025-09-30",
    "total_commission": 2500.00,
    "deals_closed": 5
  }
]
```

## GET /api/commissions/periods

List available commission periods.

**Response:**
```json
[
  {
    "period_start": "2025-09-01",
    "period_end": "2025-09-30",
    "employee_count": 15,
    "total_commission": 45000.00
  }
]
```

## Database Tables

- `agent_commission_monthly` - Monthly commission aggregates
- `commissions` - Individual commission records

## Related

- [Sales Commissions API](./sales-commissions.md) - Sales-specific commission calculations

## Examples

```bash
# List monthly commissions
curl -X GET http://localhost:8080/api/commissions/monthly \
  -H "Cookie: session_id=..."

# Filter by period
curl -X GET "http://localhost:8080/api/commissions/monthly?period_start=2025-09-01&period_end=2025-09-30" \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
