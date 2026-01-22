# Settings API

> **Source**: `api/src/routes/settings.js`

User and system settings management.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/settings | Get all settings | Required |
| GET | /api/settings/:key | Get specific setting | Required |
| PUT | /api/settings/:key | Update setting | Required |
| GET | /api/settings/user/preferences | Get user preferences | Required |
| PUT | /api/settings/user/preferences | Update user preferences | Required |

## Settings Types

### System Settings

Global settings that affect all users.

| Key | Description | Default |
|-----|-------------|---------|
| `company_name` | Company name | - |
| `default_timezone` | Default timezone | America/Toronto |
| `session_timeout_hours` | Session duration | 8 |
| `mfa_required` | Require MFA for all users | false |

### User Preferences

Per-user settings.

| Key | Description | Default |
|-----|-------------|---------|
| `theme` | UI theme (dark/light) | dark |
| `language` | UI language | en |
| `notifications_enabled` | Enable notifications | true |

## GET /api/settings

Get all settings.

**Response:**
```json
{
  "system": {
    "company_name": "LGM Group",
    "default_timezone": "America/Toronto",
    "session_timeout_hours": 8
  },
  "user": {
    "theme": "dark",
    "language": "en",
    "notifications_enabled": true
  }
}
```

## PUT /api/settings/:key

Update a setting.

**Request:**
```json
{
  "value": "new-value"
}
```

**Response:**
```json
{
  "key": "theme",
  "value": "light",
  "updated_at": "2025-10-20T14:30:00Z"
}
```

## GET /api/settings/user/preferences

Get current user's preferences.

**Response:**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications_enabled": true,
  "mfa_enabled": false
}
```

## PUT /api/settings/user/preferences

Update user preferences.

**Request:**
```json
{
  "theme": "light",
  "language": "fr"
}
```

## Database Tables

- `system_settings` - Global settings
- `user_settings` - Per-user settings
- `users` - User-specific flags (mfa_enabled, etc.)

## Examples

```bash
# Get all settings
curl -X GET http://localhost:8080/api/settings \
  -H "Cookie: session_id=..."

# Update theme
curl -X PUT http://localhost:8080/api/settings/theme \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"value": "light"}'
```

---

*Last verified: January 2026*
