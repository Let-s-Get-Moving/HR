# Security Documentation

This section covers authentication, authorization, and security measures.

## Quick Links

| Topic | Document |
|-------|----------|
| Authentication & Sessions | [authentication.md](./authentication.md) |
| Role-Based Access Control | [rbac.md](./rbac.md) |
| Security Middleware | [Backend Middleware](../backend/middleware/security.md) |

## Security Architecture

```
Request Flow:
─────────────────────────────────────────────────────────────────
Request → Security Headers → CORS → Rate Limit → SQL Prevention
    │           │              │         │            │
    │           │              │         │            └── Block injection
    │           │              │         └── Throttle abuse
    │           │              └── Validate origin
    │           └── CSP, HSTS, X-Frame
    │
    └──→ Input Sanitization → Size Limit → Audit Log → Auth Check
              │                    │           │            │
              │                    │           │            └── Validate session
              │                    │           └── Log request
              │                    └── Limit body size
              └── XSS prevention
                                                           │
                                                           ▼
                                                    RBAC Check → Handler
                                                         │
                                                         └── Check role/permissions
```

## Authentication

### Session-Based

- Sessions stored in `user_sessions` database table
- Session ID stored in HTTP-only cookie
- 8-hour session duration (extended on activity)
- Automatic session cleanup

### Multi-Factor Authentication (MFA)

- Optional TOTP-based (Google Authenticator compatible)
- Enabled per-user in settings
- Trusted devices can skip MFA for 30 days

See [authentication.md](./authentication.md) for details.

## Authorization (RBAC)

Three roles with different access levels:

| Role | Scope | Access |
|------|-------|--------|
| Admin | all | Full system access |
| Manager | all | Full access, can approve requests |
| User | own | Own data only |

See [rbac.md](./rbac.md) for details.

## Security Middleware

All applied in `api/src/server.js`:

| Middleware | Purpose |
|------------|---------|
| `securityHeaders` | CSP, HSTS, X-Frame-Options, etc. |
| `corsSecurity` | CORS configuration |
| `sqlInjectionPrevention` | Block SQL injection patterns |
| `sanitizeInput` | XSS prevention via DOMPurify |
| `requestSizeLimit` | Limit request body size (10MB) |
| `auditLog` | Log all requests |
| `sessionSecurity` | Session hardening |
| `apiRateLimit` | General rate limiting |
| `authRateLimit` | Stricter limits for auth endpoints |
| `adminRateLimit` | Limits for admin endpoints |
| `uploadRateLimit` | Limits for file uploads |

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests/15 min |
| Auth endpoints | 5 attempts/15 min |
| Admin endpoints | 30 requests/15 min |
| File uploads | 10 uploads/15 min |

## Input Validation

### API Level

Using Zod schemas in `api/src/middleware/validation.js`:

```javascript
const employeeSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  // ...
});
```

### Database Level

- Parameterized queries prevent SQL injection
- Constraints enforce data integrity

### Frontend Level

- Form validation before submission
- XSS prevention in output

## Data Protection

### Sensitive Fields

Fields that require extra protection:
- Password hashes (bcrypt)
- MFA secrets (encrypted)
- Session tokens
- SIN/SSN (optional encryption)

### Encryption

Optional field-level encryption available via `api/src/services/encryption.js`.

## Security Headers

Applied to all responses:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

## Audit Logging

All requests are logged with:
- Timestamp
- User ID (if authenticated)
- IP address
- User agent
- Request method and path
- Response status

Security events (failed logins, etc.) logged separately.

## Environment Variables

Security-related env vars:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Database connection | Yes |
| `SESSION_SECRET` | Session signing key | Auto-generated if not set |
| `NODE_ENV` | Environment (production/development) | Recommended |

## Security Checklist

For deployment:

- [ ] `NODE_ENV=production`
- [ ] HTTPS enabled (handled by Render)
- [ ] Database connection uses SSL
- [ ] Default admin password changed
- [ ] Rate limiting configured appropriately
- [ ] Audit logging enabled
- [ ] Regular dependency updates

## Reporting Security Issues

If you discover a security vulnerability:
1. Do not open a public issue
2. Contact the system administrator directly
3. Provide details of the vulnerability
4. Allow time for fix before disclosure

---

*Last verified: January 2026*
