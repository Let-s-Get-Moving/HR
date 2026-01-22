# Termination API

> **Source**: `api/src/routes/termination.js`

Employee termination and offboarding.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| POST | /api/termination/:id | Terminate employee | Required | Manager+ |
| GET | /api/termination/:id/checklist | Get offboarding checklist | Required | Manager+ |
| PUT | /api/termination/:id/checklist | Update checklist | Required | Manager+ |

## POST /api/termination/:id

Terminate an employee.

**Request:**
```json
{
  "termination_date": "2025-10-31",
  "termination_reason": "Voluntary resignation",
  "final_pay_date": "2025-10-31",
  "notes": "2 weeks notice given"
}
```

**Effects:**
- Sets employee status to "Terminated"
- Sets termination_date
- Stores termination_reason
- Creates offboarding checklist
- Triggers compliance checks (final pay, etc.)

**Response:**
```json
{
  "employee_id": 123,
  "status": "Terminated",
  "termination_date": "2025-10-31",
  "checklist_id": 456
}
```

## GET /api/termination/:id/checklist

Get offboarding checklist for terminated employee.

**Response:**
```json
{
  "id": 456,
  "employee_id": 123,
  "items": [
    { "task": "Return laptop", "completed": false },
    { "task": "Return keys/badges", "completed": false },
    { "task": "Exit interview", "completed": true },
    { "task": "Final pay processed", "completed": false },
    { "task": "Benefits termination", "completed": false },
    { "task": "System access revoked", "completed": true }
  ],
  "completion_percentage": 33
}
```

## PUT /api/termination/:id/checklist

Update checklist item status.

**Request:**
```json
{
  "task": "Return laptop",
  "completed": true
}
```

**Response:**
```json
{
  "message": "Checklist updated",
  "completion_percentage": 50
}
```

## Termination Types

| Reason | Description |
|--------|-------------|
| Voluntary resignation | Employee resigned |
| Involuntary termination | Company-initiated |
| End of contract | Contract expired |
| Retirement | Employee retired |
| Other | Other reasons |

## Database Tables

- `employees` - status, termination_date, termination_reason
- `termination_checklists` - Offboarding tasks
- `employee_status_history` - Status change history

## Examples

```bash
# Terminate employee
curl -X POST http://localhost:8080/api/termination/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "termination_date": "2025-10-31",
    "termination_reason": "Voluntary resignation"
  }'

# Get checklist
curl -X GET http://localhost:8080/api/termination/123/checklist \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
