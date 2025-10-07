# Trusted Device (MFA Bypass) Feature

## Overview
The Trusted Device feature allows users to bypass MFA for 7 days on devices they trust, improving UX without sacrificing security.

---

## How It Works

### User Flow
1. **Login** → Enter username/password
2. **MFA Required** → Enter 6-digit code
3. **Trust Device** → Check ☑️ "Trust this device for 7 days"
4. **Next Login** → Password only (MFA bypassed for 7 days)

### Technical Implementation
- **Device Identification**: Server-managed random 256-bit token
- **Storage**: Secure, HttpOnly, SameSite=Strict cookie (`td_v1`)
- **Hashing**: HMAC-SHA256 with pepper (`TD_PEPPER` env var)
- **Security**: Constant-time comparison (timing attack prevention)
- **Rotation**: Token rotates on every use (replay protection)
- **Max Devices**: 10 per user (FIFO eviction)

---

## Database Schema

```sql
CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  ua_family TEXT,
  os_family TEXT,
  ip_created INET,
  ip_last_used INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT
);
```

---

## Environment Variables

### Required
- **`TD_PEPPER`**: 64-byte random secret for token hashing
  ```bash
  openssl rand -base64 64
  ```

### Optional
- **`TD_PEPPER_PREV`**: Previous pepper (for rotation grace period)
- **`CLEANUP_SECRET`**: Secret token for cleanup endpoint

---

## API Endpoints

### List Trusted Devices
```http
GET /api/trusted-devices
Authorization: sessionId

Response: [
  {
    "id": "uuid",
    "label": "Chrome on macOS",
    "browser": "Chrome",
    "os": "macOS",
    "ipCreated": "192.168.1.1",
    "ipLastUsed": "192.168.1.1",
    "createdAt": "2025-10-07T...",
    "lastUsedAt": "2025-10-07T...",
    "expiresAt": "2025-10-14T...",
    "expiresIn": "5 days"
  }
]
```

### Revoke Device
```http
DELETE /api/trusted-devices/:deviceId
Authorization: sessionId

Response: { "success": true, "message": "Device revoked successfully" }
```

### Revoke All Devices
```http
POST /api/trusted-devices/revoke-all
Authorization: sessionId

Response: { "success": true, "message": "3 device(s) revoked successfully", "count": 3 }
```

### Cleanup Expired Devices (Cron)
```http
POST /api/trusted-devices/cleanup
X-Cleanup-Secret: <CLEANUP_SECRET>

Response: { "success": true, "count": 5 }
```

---

## UI Features

### MFA Verification Screen
- ☑️ **"Trust this device for 7 days"** checkbox
- Warning: "Only enable on devices you personally own and control"

### Settings → Security → Trusted Devices
- **Device List**: Shows all trusted devices
- **Device Info**: Browser, OS, last used, expires in, IP
- **Actions**: Revoke individual device or revoke all
- **Empty State**: Guide users to trust a device during login

---

## Security Features

### Automatic Revocation
- **MFA Disabled**: All devices revoked immediately
- **Password Changed**: All devices revoked (optional, configured)
- **Max Limit**: Oldest device auto-revoked when limit exceeded
- **Expiry**: Devices expire after 7 days (configurable)

### Step-Up Authentication
These actions **always require MFA**, even on trusted devices:
- Change password/email
- View API keys
- Export data
- Manage admins
- Add payout methods
- Change MFA settings

### Risk-Based Overrides
MFA required even on trusted device if:
- Geo/ASN jump detected
- Multiple failed password attempts
- Bot signals detected

---

## Pepper Rotation

### When to Rotate
- Every 6-12 months (routine)
- Immediately on suspicion of compromise

### How to Rotate
1. Generate new pepper: `openssl rand -base64 64`
2. Set as `TD_PEPPER_PREV` in Render
3. Move current `TD_PEPPER` → `TD_PEPPER_PREV`
4. Set new pepper as `TD_PEPPER`
5. Wait 7-14 days (grace period)
6. Delete `TD_PEPPER_PREV`

During grace period, system accepts tokens hashed with either pepper and automatically rotates them to the new pepper.

---

## Cleanup Job

### Manual Cleanup
```bash
cd api
node src/jobs/cleanup-trusted-devices.js
```

### Scheduled Cleanup (Render Cron)
1. Go to Render Dashboard
2. Select API service
3. Add **Cron Job**:
   - **Schedule**: `0 2 * * *` (2 AM daily)
   - **Command**: `curl -X POST https://hr-api-wbzs.onrender.com/api/trusted-devices/cleanup -H "x-cleanup-secret: YOUR_SECRET"`

Or use Render's native cron job feature:
```bash
# In render.yaml
services:
  - type: cron
    name: cleanup-trusted-devices
    env: web
    schedule: "0 2 * * *"
    buildCommand: ""
    startCommand: "node api/src/jobs/cleanup-trusted-devices.js"
```

---

## Testing

### Test Full Flow
1. Enable MFA on your account
2. Logout
3. Login with password + MFA code
4. Check ☑️ "Trust this device for 7 days"
5. Verify login succeeds
6. Logout
7. Login again (should only ask for password)
8. Go to Settings → Security → Trusted Devices
9. Verify device appears in list
10. Click "Revoke"
11. Logout
12. Login (should ask for MFA again)

### Test Device Limit
1. Trust 10 devices
2. Trust 11th device
3. Verify oldest device is auto-revoked

### Test Expiry
1. Trust a device
2. Change device's `expires_at` to past date in database
3. Run cleanup job
4. Verify device is deleted

---

## Troubleshooting

### "Trusted devices not working"
- Check `TD_PEPPER` is set in Render env vars
- Check browser accepts cookies
- Check cookie domain/path settings
- Check for CORS issues

### "Device not appearing in Settings"
- Check API endpoint is accessible
- Check user is authenticated
- Check browser console for errors
- Check API logs for errors

### "Cleanup not running"
- Check cron job is scheduled
- Check `CLEANUP_SECRET` matches
- Check API endpoint is accessible
- Run manual cleanup to test

---

## Configuration

### Adjust Trust Duration
In `api/src/services/trusted-devices.js`:
```js
static CONFIG = {
  DEFAULT_DURATION_DAYS: 7, // Change this
  ...
}
```

### Adjust Max Devices
```js
static CONFIG = {
  MAX_DEVICES_PER_USER: 10, // Change this
  ...
}
```

### Cookie Settings
```js
static CONFIG = {
  COOKIE_NAME: 'td_v1',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // or 'lax' if needed
    path: '/'
  }
}
```

---

## Future Enhancements

- [ ] Device nicknames (user-editable labels)
- [ ] Email notifications on new device trust
- [ ] Geolocation tracking
- [ ] Browser fingerprinting (soft check)
- [ ] Device type icons (mobile/desktop/tablet)
- [ ] Last IP address history
- [ ] Trust duration per device (not just global 7 days)

---

## Security Checklist

- ✅ HMAC-SHA256 with pepper
- ✅ Constant-time comparison
- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Token rotation (replay protection)
- ✅ Dual-pepper rotation (zero-downtime)
- ✅ Max device limit (FIFO)
- ✅ Auto-revoke on MFA disable
- ✅ Auto-revoke on password change (optional)
- ✅ Step-up auth for sensitive actions
- ✅ Nightly cleanup job
- ✅ Never log tokens or cookies
- ✅ DB stores only hashes, not secrets

---

## Compliance Notes

- Trusted devices are **user-initiated** (explicit consent)
- Devices can be **revoked anytime** (user control)
- Device list is **transparent** (GDPR compliance)
- IP addresses are **anonymized if needed** (privacy)
- Cookies are **first-party only** (no tracking)
- System logs **no PII** (security)

---

## References

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [Google "Remember this device" implementation](https://support.google.com/accounts/answer/7162782)
