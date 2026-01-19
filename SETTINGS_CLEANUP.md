# Settings Cleanup - Non-Functional Placeholders Removed

**Date:** January 19, 2026  
**Reason:** Remove misleading UI controls that don't actually work

---

## Summary

Removed settings that were stored in the database but never enforced by backend code. Users could toggle these settings but they had zero effect on system behavior.

---

## What Was Removed

### 1. Maintenance Tab (ENTIRE TAB)
**All settings were non-functional:**

- `backup_enabled` - No backup system exists
- `backup_frequency_days` - No scheduled backups
- `cleanup_enabled` - No cleanup jobs running
- `retention_days` - Nothing reads this value
- `maintenance_mode` - No access blocking when enabled

**Impact:** None. These were pure UI placeholders.

---

### 2. Security Settings (Hardcoded Values)

Removed settings where UI values were ignored in favor of hardcoded constants:

| Setting | UI Showed | Actual Value (Hardcoded) | Location |
|---------|-----------|--------------------------|----------|
| `session_timeout_minutes` | Editable number | 8 hours | `auth.js:71` |
| `max_login_attempts` | Editable number | 5 attempts | `account-lockout.js:13` |
| `lockout_duration_minutes` | Editable number | 30 minutes | `account-lockout.js:14` |
| `password_min_length` | Editable number | 8 characters | `auth-mfa.js:612` |

**Kept working security settings:**
- ✓ `two_factor_auth` - Fully functional MFA system
- ✓ `password_expiry_days` - Enforced at login via database trigger

---

### 3. Notification Settings (Not Implemented)

Removed notification types with no backend implementation:

- `push_notifications` - No push notification service
- `sms_notifications` - No SMS service

**Kept working notification setting:**
- ✓ `email_notifications` - Actually checked before sending emails (`notifications.js:14`)

---

## What Still Works

### Preferences (All Functional)
- `theme` - Dark/light mode switching
- `language` - i18n language selection
- `timezone` - User timezone preference
- `items_per_page` - Pagination size
- `dashboard_refresh` - Auto-refresh interval

### Notifications (1 Functional)
- `email_notifications` - Email on/off toggle

### Security (2 Functional)
- `two_factor_auth` - MFA enable/disable
- `password_expiry_days` - Password expiration enforcement

---

## Files Changed

### Frontend
- `web/src/pages/Settings.jsx`
  - Removed maintenance tab
  - Removed maintenance state/refs
  - Removed non-functional setting rendering

### Backend
- `api/src/routes/settings.js`
  - Removed `/maintenance` GET/PUT endpoints
  - Added filtering for `/notifications` (removes push/sms)
  - Added filtering for `/security` (removes hardcoded settings)
  - Updated `/export` endpoint

### Database
- `db/migrations/cleanup-non-functional-settings.sql`
  - Migration to delete non-functional settings from database

---

## Migration Instructions

Run the cleanup migration:

```bash
psql -d hr_database -f db/migrations/cleanup-non-functional-settings.sql
```

This removes all non-functional settings from existing databases.

---

## Future: If You Want to Make These Actually Work

If you want to implement these features properly:

### Session Timeout
```javascript
// In session.js, read from settings instead of hardcoding
const timeoutSetting = await getSetting('session_timeout_minutes');
const SESSION_TIMEOUT = (timeoutSetting?.value || 60) * 60 * 1000;
```

### Login Attempts
```javascript
// In account-lockout.js, read from settings
const MAX_FAILED_ATTEMPTS = await getSetting('max_login_attempts') || 5;
const LOCKOUT_DURATION = (await getSetting('lockout_duration_minutes') || 30) * 60 * 1000;
```

### Backup/Maintenance
Implement actual backup system with:
- Scheduled cron jobs
- Database dump scripts
- Maintenance mode middleware to block requests

---

## Notes

- No user-facing breaking changes (these settings never worked anyway)
- Existing user preferences remain untouched
- System now only shows settings that actually do something
