# Messages Page

> **Source**: `web/src/pages/Messages.jsx`

Chat and messaging interface.

## Overview

The Messages page provides:
- Chat threads list
- Real-time messaging
- Direct messages and group chats
- File attachments

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | Full access |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/chat/threads | List threads |
| GET /api/chat/threads/:id | Thread with messages |
| POST /api/chat/threads | Create thread |
| POST /api/chat/threads/:id/messages | Send message |
| PUT /api/chat/threads/:id/read | Mark as read |
| GET /api/chat/users | Available users |

## UI Layout

### Sidebar

Thread list showing:
- Participant names
- Last message preview
- Unread count badge
- Time since last message

### Chat Window

Selected thread:
- Message list (scrollable)
- Message input
- Send button
- Attachment button

### Message Display

Each message shows:
- Sender name
- Message content
- Timestamp
- Attachments (if any)

## Components Used

- `ChatSidebar` - Thread list
- `ChatWindow` - Message view
- `ChatMessage` - Individual message
- `ChatAttachment` - File attachment display

## State

```jsx
const [threads, setThreads] = useState([]);
const [selectedThread, setSelectedThread] = useState(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState("");
const [users, setUsers] = useState([]);
```

## Real-time Updates

WebSocket connection for:
- New message notifications
- Thread updates
- Read receipts

See `hooks/useWebSocket.js`.

## Create New Chat

1. Click "New Chat" button
2. Select user(s) to chat with
3. For 1 user: Direct message
4. For multiple users: Group chat (can name it)
5. Thread created, ready to message

## Message Sending

1. Type message in input
2. Press Enter or click Send
3. Message sent to API
4. Appears in chat immediately
5. Other participants receive via WebSocket

## Attachments

Upload files to messages:
1. Click attachment button
2. Select file
3. File uploaded
4. Appears in message

## Related

- [Chat API](../../backend/routes/chat.md)
- [useWebSocket Hook](../hooks/use-websocket.md)

---

*Last verified: January 2026*
