# Authentication API (MFA-Enabled)

> **Source**: `api/src/routes/auth-mfa.js`

Authentication endpoints with optional TOTP-based multi-factor authentication.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/login | Login with username/password | No |
| POST | /api/auth/verify-mfa | Verify MFA TOTP code | No (temp token) |
| POST | /api/auth/logout | End session | Required |
| GET | /api/auth/session | Check session validity | No |
| POST | /api/auth/mfa/setup | Start MFA setup | Required |
| POST | /api/auth/mfa/verify-setup | Complete MFA setup | Required |
| POST | /api/auth/mfa/disable | Disable MFA | Required |
| POST | /api/auth/change-password | Change password | Required |

## POST /api/auth/login

Authenticate with username and password.

**Request:**
```json
{
  "username": "Avneet",
  "password": "password123"
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
    "role": "Manager",
    "employeeId": 123
  }
}
```

**Response (MFA required):**
```json
{
  "mfa_required": true,
  "temp_token": "temporary-auth-token"
}
```

**Errors:**
- `401`: Invalid credentials
- `429`: Too many login attempts (rate limited)

## POST /api/auth/verify-mfa

Verify TOTP code after login (when MFA is enabled).

**Request:**
```json
{
  "temp_token": "temporary-auth-token",
  "totp_code": "123456",
  "trust_device": true
}
```

**Response:**
```json
{
  "message": "MFA verified successfully",
  "user": {
    "id": 1,
    "username": "Avneet",
    "role": "Manager"
  }
}
```

**Errors:**
- `401`: Invalid or expired temp token
- `401`: Invalid TOTP code

## GET /api/auth/session

Check if current session is valid.

**Response (valid):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "Avneet",
    "role": "Manager"
  }
}
```

**Response (invalid):**
```json
{
  "valid": false
}
```

## POST /api/auth/logout

End the current session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## MFA Setup

### POST /api/auth/mfa/setup

Start MFA setup. Returns QR code for authenticator app.

**Response:**
```json
{
  "secret": "BASE32SECRETKEY",
  "qr_code": "data:image/png;base64,..."
}
```

### POST /api/auth/mfa/verify-setup

Complete MFA setup by verifying initial code.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "MFA enabled successfully"
}
```

### POST /api/auth/mfa/disable

Disable MFA (requires password confirmation).

**Request:**
```json
{
  "password": "current-password"
}
```

**Response:**
```json
{
  "message": "MFA disabled successfully"
}
```

## POST /api/auth/change-password

Change the current user's password.

**Request:**
```json
{
  "current_password": "old-password",
  "new_password": "new-password"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

## Session Cookie

On successful login, a session cookie is set:
- Name: `session_id`
- HTTP-only: Yes
- Secure: Yes (production)
- SameSite: Lax
- Duration: 8 hours

## Rate Limiting

Auth endpoints have stricter rate limiting:
- 5 attempts per 15 minutes
- Applies to: `/api/auth/login`, `/api/auth/verify-mfa`

## Database Tables

- `users` - User accounts
- `user_sessions` - Active sessions
- `trusted_devices` - MFA trusted devices

## Related

- [Security Overview](../../security/README.md)
- [Authentication Details](../../security/authentication.md)
- [Trusted Devices API](./trusted-devices.md)

## Examples

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "Avneet", "password": "password123"}'

# Check session
curl -X GET http://localhost:8080/api/auth/session \
  -b cookies.txt

# Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -b cookies.txt
```

---

*Last verified: January 2026*
