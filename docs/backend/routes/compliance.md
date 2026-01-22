# Compliance API

> **Source**: `api/src/routes/compliance.js`

Compliance monitoring and alerts for document expirations.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/compliance/alerts | List active alerts | Required |
| POST | /api/compliance/generate-alerts | Generate new alerts | Required |
| PUT | /api/compliance/alerts/:id/resolve | Resolve an alert | Required |
| GET | /api/compliance/stats | Get compliance statistics | Required |

## GET /api/compliance/alerts

List active compliance alerts.

**Query Parameters:**
- `status` - Filter by status (Active, Resolved)
- `type` - Filter by alert type

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "alert_type": "SIN_EXPIRY",
    "description": "SIN expires in 30 days",
    "due_date": "2025-11-15",
    "status": "Active",
    "created_at": "2025-10-15T10:00:00Z"
  }
]
```

## POST /api/compliance/generate-alerts

Generate alerts for upcoming expirations.

Checks:
- SIN expiry (30 days warning)
- Work permit expiry (60 days warning)
- Contract expiry (30 days warning)
- Training expiry

**Response:**
```json
{
  "message": "Alerts generated successfully",
  "alerts_created": 5
}
```

## PUT /api/compliance/alerts/:id/resolve

Mark an alert as resolved.

**Request:**
```json
{
  "resolution_notes": "Document renewed"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "Resolved",
  "resolved_at": "2025-10-20T14:30:00Z",
  "resolved_by": 1
}
```

## GET /api/compliance/stats

Get compliance statistics.

**Response:**
```json
{
  "total_active": 12,
  "by_type": {
    "SIN_EXPIRY": 3,
    "WORK_PERMIT_EXPIRY": 5,
    "CONTRACT_EXPIRY": 2,
    "TRAINING_EXPIRY": 2
  },
  "upcoming_30_days": 8,
  "overdue": 1
}
```

## Alert Types

| Type | Description | Warning Period |
|------|-------------|----------------|
| SIN_EXPIRY | Social Insurance Number expiring | 30 days |
| WORK_PERMIT_EXPIRY | Work permit expiring | 60 days |
| CONTRACT_EXPIRY | Employment contract expiring | 30 days |
| TRAINING_EXPIRY | Required training expired | 0 days |

## Database Tables

- `compliance_alerts` - Alert records
- `employees` - Source of expiry dates
- `training_records` - Training completions

## Examples

```bash
# Get active alerts
curl -X GET http://localhost:8080/api/compliance/alerts \
  -H "Cookie: session_id=..."

# Generate new alerts
curl -X POST http://localhost:8080/api/compliance/generate-alerts \
  -H "Cookie: session_id=..."

# Resolve alert
curl -X PUT http://localhost:8080/api/compliance/alerts/1/resolve \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"resolution_notes": "SIN renewed"}'
```

---

*Last verified: January 2026*
