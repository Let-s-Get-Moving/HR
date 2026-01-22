# Chat API

> **Source**: `api/src/routes/chat.js`

Messaging and chat functionality.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/chat/threads | List chat threads | Required |
| GET | /api/chat/threads/:id | Get thread with messages | Required |
| POST | /api/chat/threads | Create new thread | Required |
| POST | /api/chat/threads/:id/messages | Send message | Required |
| GET | /api/chat/users | List users for chat | Required |
| PUT | /api/chat/threads/:id/read | Mark thread as read | Required |

## GET /api/chat/threads

List user's chat threads.

**Response:**
```json
[
  {
    "id": 1,
    "name": null,
    "is_group": false,
    "participants": [
      { "id": 1, "username": "John" },
      { "id": 2, "username": "Jane" }
    ],
    "last_message": {
      "content": "Hello!",
      "sent_at": "2025-10-20T14:30:00Z",
      "sender_id": 1
    },
    "unread_count": 2
  }
]
```

## GET /api/chat/threads/:id

Get thread with messages.

**Query Parameters:**
- `limit` - Max messages (default: 50)
- `before` - Get messages before this message ID

**Response:**
```json
{
  "id": 1,
  "participants": [...],
  "messages": [
    {
      "id": 1,
      "sender_id": 1,
      "sender_name": "John",
      "content": "Hello!",
      "sent_at": "2025-10-20T14:30:00Z",
      "attachments": []
    }
  ]
}
```

## POST /api/chat/threads

Create a new chat thread.

**Request (DM):**
```json
{
  "participant_ids": [2]
}
```

**Request (Group):**
```json
{
  "participant_ids": [2, 3, 4],
  "name": "Project Team",
  "is_group": true
}
```

**Response:**
```json
{
  "id": 5,
  "participants": [...],
  "is_group": false
}
```

## POST /api/chat/threads/:id/messages

Send a message to a thread.

**Request:**
```json
{
  "content": "Hello everyone!"
}
```

**Response:**
```json
{
  "id": 100,
  "thread_id": 1,
  "sender_id": 1,
  "content": "Hello everyone!",
  "sent_at": "2025-10-20T15:00:00Z"
}
```

## Real-time Updates

Chat messages are pushed via WebSocket when connected. See `api/src/websocket/server.js`.

## Database Tables

- `chat_threads` - Chat thread metadata
- `chat_thread_participants` - Thread membership
- `chat_messages` - Message content
- `chat_attachments` - File attachments

## Examples

```bash
# Get threads
curl -X GET http://localhost:8080/api/chat/threads \
  -H "Cookie: session_id=..."

# Send message
curl -X POST http://localhost:8080/api/chat/threads/1/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"content": "Hello!"}'
```

---

*Last verified: January 2026*
