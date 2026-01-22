# Leave Requests API

> **Source**: `api/src/routes/leave-requests.js`

Leave request submission and approval workflow.

## Endpoints

| Method | Path | Description | Auth | Permission |
|--------|------|-------------|------|------------|
| POST | /api/leave-requests | Submit leave request | Required | Any |
| GET | /api/leave-requests | List leave requests | Required | Scoped |
| GET | /api/leave-requests/pending | List pending requests | Required | leave.approve |
| PUT | /api/leave-requests/:id/status | Approve/reject request | Required | leave.approve |
| GET | /api/leave-requests/stats | Get request statistics | Required | leave.view |

## RBAC Scope

- **Admin/Manager**: See all requests, can approve/reject
- **User**: See only their own requests, can only submit (not approve)

## POST /api/leave-requests

Submit a new leave request.

**Request:**
```json
{
  "leave_type": "Vacation",
  "start_date": "2025-10-15",
  "end_date": "2025-10-20",
  "reason": "Family vacation"
}
```

**Validation:**
- `leave_type`: string, required
- `start_date`: YYYY-MM-DD, required
- `end_date`: YYYY-MM-DD, required, must be >= start_date
- `reason`: string, optional

**Business Rules:**
- Cannot submit overlapping pending requests
- Status automatically set to "Pending"
- `total_days` calculated automatically (inclusive)

**Response:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "data": {
    "id": 123,
    "employee_id": 456,
    "leave_type": "Vacation",
    "start_date": "2025-10-15",
    "end_date": "2025-10-20",
    "total_days": 6,
    "status": "Pending",
    "reason": "Family vacation"
  }
}
```

**Errors:**
- `400`: Overlapping pending request exists
- `400`: Invalid date format

## GET /api/leave-requests

List leave requests (filtered by role).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "employee_id": 456,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "leave_type": "Vacation",
      "start_date": "2025-10-15",
      "end_date": "2025-10-20",
      "total_days": 6,
      "status": "Pending",
      "reason": "Family vacation",
      "requested_at": "2025-10-01T10:30:00Z"
    }
  ]
}
```

## GET /api/leave-requests/pending

List pending requests (Manager/Admin only).

Includes employee leave balances for context.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "employee_id": 456,
      "first_name": "John",
      "last_name": "Doe",
      "leave_type": "Vacation",
      "start_date": "2025-10-15",
      "end_date": "2025-10-20",
      "total_days": 6,
      "status": "Pending",
      "vacation_balance": 15,
      "sick_balance": 5,
      "personal_balance": 3
    }
  ]
}
```

## PUT /api/leave-requests/:id/status

Approve or reject a leave request (Manager/Admin only).

**Request:**
```json
{
  "status": "Approved",
  "review_notes": "Approved for family vacation"
}
```

**Validation:**
- `status`: "Approved" | "Rejected"
- `review_notes`: string, optional

**Side Effects:**
- On approval, sets `leave_type_id` for calendar integration
- Creates notification for the employee
- Updates `approved_by` and `approved_at`

**Response:**
```json
{
  "success": true,
  "message": "Leave request approved successfully",
  "data": {
    "id": 123,
    "status": "Approved",
    "approved_by": 1,
    "approved_at": "2025-10-02T14:30:00Z"
  }
}
```

## GET /api/leave-requests/stats

Get leave request statistics (counts by status).

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "approved": 45,
    "rejected": 3
  }
}
```

## Status Workflow

```
Pending  ──┬──> Approved
           │
           └──> Rejected
```

- Employees submit requests → status = "Pending"
- Manager/Admin approves → status = "Approved"
- Manager/Admin rejects → status = "Rejected"
- Users cannot change status

## Notifications

When a request is approved/rejected:
1. System finds the employee's user account
2. Creates notification with type `leave_approval` or `leave_rejection`
3. Notification appears in NotificationCenter

## Database Tables

- `leave_requests` - Leave request records
- `leave_types` - Leave type definitions (Vacation, Sick, Personal)
- `leave_balances` - Employee leave balances by year

## Related Endpoints

See also:
- [leave.md](./leave.md) - Leave balances and calendar

## Examples

```bash
# Submit leave request
curl -X POST http://localhost:8080/api/leave-requests \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "leave_type": "Vacation",
    "start_date": "2025-10-15",
    "end_date": "2025-10-20",
    "reason": "Family vacation"
  }'

# Get my requests (as user)
curl -X GET http://localhost:8080/api/leave-requests \
  -H "Cookie: session_id=..."

# Get pending requests (as manager)
curl -X GET http://localhost:8080/api/leave-requests/pending \
  -H "Cookie: session_id=..."

# Approve request
curl -X PUT http://localhost:8080/api/leave-requests/123/status \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"status": "Approved", "review_notes": "Approved"}'
```

---

*Last verified: January 2026*
