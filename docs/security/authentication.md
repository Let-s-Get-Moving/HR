# Authentication

> **Source**: `api/src/routes/auth-mfa.js`, `api/src/session.js`

This document covers the login system, sessions, and multi-factor authentication.

## Overview

The system uses session-based authentication with optional TOTP MFA.

## Login Flow

```
User submits username/password
           │
           ▼
POST /api/auth/login
           │
           ├── Validate credentials (bcrypt)
           │
           ├── Check if MFA enabled?
           │         │
           │         ├── No → Create session, return user
           │         │
           │         └── Yes → Check if trusted device?
           │                       │
           │                       ├── Yes → Create session
           │                       │
           │                       └── No → Return mfa_required: true
           │                                      │
           │                                      ▼
           │                           User submits TOTP code
           │                                      │
           │                                      ▼
           │                           POST /api/auth/verify-mfa
           │                                      │
           │                                      ├── Validate TOTP
           │                                      ├── Optional: Trust device
           │                                      └── Create session
           │
           ▼
Session cookie set, user logged in
```

## API Endpoints

### POST /api/auth/login

Authenticate with username and password.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (success, no MFA):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "Avneet",
    "email": "admin@hrsystem.com",
    "role": "Manager"
  }
}
```

**Response (MFA required):**
```json
{
  "mfa_required": true,
  "temp_token": "temporary-token-for-mfa"
}
```

### POST /api/auth/verify-mfa

Verify TOTP code after login.

**Request:**
```json
{
  "temp_token": "string",
  "totp_code": "123456",
  "trust_device": true
}
```

**Response:**
```json
{
  "message": "MFA verified successfully",
  "user": { ... }
}
```

### GET /api/auth/session

Check if current session is valid.

**Response (valid):**
```json
{
  "valid": true,
  "user": { ... }
}
```

**Response (invalid):**
```json
{
  "valid": false
}
```

### POST /api/auth/logout

End current session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Session Management

### Session Storage

Sessions stored in `user_sessions` table:

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

### Session Cookie

- Name: `session_id`
- HTTP-only: Yes (not accessible via JavaScript)
- Secure: Yes (in production)
- SameSite: Lax
- Duration: 8 hours

### Session Validation

The `requireAuth` middleware validates sessions:

```javascript
// api/src/session.js
export async function requireAuth(req, res, next) {
  const sessionId = req.cookies.session_id;
  
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const session = await validateSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: "Session invalid or expired" });
  }
  
  req.user = session.user;
  next();
}
```

## Multi-Factor Authentication (MFA)

### Setup Flow

1. User enables MFA in Settings
2. Server generates TOTP secret
3. Server returns QR code for authenticator app
4. User scans QR code
5. User enters verification code
6. MFA is enabled

### Endpoints

**POST /api/auth/mfa/setup**

Start MFA setup, returns QR code.

```json
{
  "secret": "base32-secret",
  "qr_code": "data:image/png;base64,..."
}
```

**POST /api/auth/mfa/verify-setup**

Verify initial setup code.

```json
{
  "code": "123456"
}
```

**POST /api/auth/mfa/disable**

Disable MFA (requires password confirmation).

### Trusted Devices

Users can mark a device as "trusted" to skip MFA for 30 days.

Stored in `trusted_devices` table:
- Device fingerprint (hashed)
- User ID
- Expiration date
- Last used

## Password Policy

Current implementation:
- Minimum 8 characters (recommended)
- No complexity requirements enforced
- Passwords hashed with bcrypt (12 rounds)

### Password Expiry (Optional)

If enabled, passwords expire after a configurable period:
- Warning shown N days before expiry
- User prompted to change password
- Can be disabled in settings

## Security Considerations

### Brute Force Protection

- Rate limiting on `/api/auth` endpoints (5 attempts/15 min)
- Failed login attempts logged
- Account lockout not implemented (TODO)

### Session Security

- Session IDs are cryptographically random
- Sessions tied to IP and user agent
- Sessions invalidated on logout
- Expired sessions cleaned up automatically

### Cookie Security

- HTTP-only prevents XSS theft
- Secure flag in production (HTTPS only)
- SameSite prevents CSRF

## Troubleshooting

### "Invalid credentials" error

1. Verify username is correct (case-sensitive)
2. Verify password is correct
3. Check if user exists in database

### Session expires immediately

1. Check browser accepts cookies
2. Check clock synchronization
3. Verify `user_sessions` table exists

### MFA code rejected

1. Check authenticator app clock is synchronized
2. Try the next code (codes change every 30 seconds)
3. Verify MFA secret matches

### Can't log in at all

Reset the admin user:

```bash
cd api
node ../scripts/setup-admin-user.js
```

---

*Last verified: January 2026*
