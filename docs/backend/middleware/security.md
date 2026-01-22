# Security Middleware

> **Source**: `api/src/middleware/security.js`

Core security middleware providing protection against common attacks.

## Exports

| Middleware | Purpose |
|------------|---------|
| `securityHeaders` | Set security HTTP headers |
| `corsSecurity` | CORS configuration |
| `sqlInjectionPrevention` | Block SQL injection patterns |
| `sanitizeInput` | XSS prevention |
| `requestSizeLimit` | Limit request body size |
| `auditLog` | Log all requests |
| `sessionSecurity` | Session hardening |
| `apiRateLimit` | General rate limiting |
| `authRateLimit` | Auth endpoint rate limiting |
| `adminRateLimit` | Admin endpoint rate limiting |
| `uploadRateLimit` | Upload rate limiting |

## securityHeaders

Sets HTTP security headers:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

## corsSecurity

Configures CORS:
- Allows credentials
- Configures allowed origins
- Sets allowed methods and headers

## sqlInjectionPrevention

Scans request body/params/query for SQL injection patterns:
- Union select
- Drop table
- Insert into
- Comment markers (--)
- Encoded attacks

Returns 400 if suspicious pattern detected.

## sanitizeInput

Uses DOMPurify to sanitize string inputs:
- Removes script tags
- Strips dangerous attributes
- Prevents XSS attacks

## requestSizeLimit(limit)

Factory function for body size limiting:

```javascript
app.use(requestSizeLimit('10mb'));
```

## Rate Limiting

| Limiter | Window | Max Requests |
|---------|--------|--------------|
| apiRateLimit | 15 min | 100 |
| authRateLimit | 15 min | 5 |
| adminRateLimit | 15 min | 30 |
| uploadRateLimit | 15 min | 10 |

## Usage in server.js

```javascript
import security from "./middleware/security.js";

app.use(security.securityHeaders);
app.use(security.corsSecurity);
app.use(security.sqlInjectionPrevention);
app.use(security.sanitizeInput);
app.use(security.requestSizeLimit('10mb'));
app.use(security.auditLog);
app.use(security.sessionSecurity);
app.use(security.apiRateLimit);

// Stricter limits for specific routes
app.use('/api/auth', security.authRateLimit);
app.use('/api/admin', security.adminRateLimit);
app.use('/api/imports', security.uploadRateLimit);
```

## Related

- [Security Overview](../../security/README.md)

---

*Last verified: January 2026*
