# Notifications API

> **Source**: `api/src/routes/notifications.js`

User notification management.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/notifications | Get user's notifications | Required |
| GET | /api/notifications/unread-count | Get unread count | Required |
| PUT | /api/notifications/:id/read | Mark as read | Required |
| PUT | /api/notifications/read-all | Mark all as read | Required |
| DELETE | /api/notifications/:id | Delete notification | Required |

## GET /api/notifications

Get current user's notifications.

**Query Parameters:**
- `limit` - Max notifications to return (default: 50)
- `unread_only` - Only return unread (default: false)

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "type": "leave_approval",
    "title": "Leave Request Approved",
    "message": "Your vacation request has been approved.",
    "is_read": false,
    "reference_id": 456,
    "reference_type": "leave_request",
    "created_at": "2025-10-20T14:30:00Z"
  }
]
```

## GET /api/notifications/unread-count

Get count of unread notifications.

**Response:**
```json
{
  "count": 5
}
```

## PUT /api/notifications/:id/read

Mark a notification as read.

**Response:**
```json
{
  "id": 1,
  "is_read": true,
  "read_at": "2025-10-20T15:00:00Z"
}
```

## PUT /api/notifications/read-all

Mark all notifications as read.

**Response:**
```json
{
  "updated": 5
}
```

## Notification Types

| Type | Description |
|------|-------------|
| `leave_approval` | Leave request approved |
| `leave_rejection` | Leave request rejected |
| `leave_request` | New leave request (for managers) |
| `compliance_alert` | Compliance alert created |
| `system` | System notification |

## Creating Notifications

Notifications are created via the `createNotification` utility:

```javascript
import { createNotification } from '../utils/notifications.js';

await createNotification(
  userId,           // Target user
  'leave_approval', // Type
  'Leave Approved', // Title
  'Your request was approved', // Message
  requestId,        // Reference ID (optional)
  'leave_request'   // Reference type (optional)
);
```

## Database Tables

- `notifications` - Notification records

## Real-time Updates

Notifications can be pushed via WebSocket when the client is connected.

## Examples

```bash
# Get notifications
curl -X GET http://localhost:8080/api/notifications \
  -H "Cookie: session_id=..."

# Get unread count
curl -X GET http://localhost:8080/api/notifications/unread-count \
  -H "Cookie: session_id=..."

# Mark as read
curl -X PUT http://localhost:8080/api/notifications/1/read \
  -H "Cookie: session_id=..."

# Mark all as read
curl -X PUT http://localhost:8080/api/notifications/read-all \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
