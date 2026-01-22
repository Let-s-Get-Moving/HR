# Backend Documentation

> **Source**: `api/src/`

The backend is a Node.js/Express REST API that handles all business logic, data persistence, and authentication.

## Quick Reference

| What | Where |
|------|-------|
| Main server setup | `api/src/server.js` |
| Database connection | `api/src/db.js` |
| Session management | `api/src/session.js` |
| Route handlers | `api/src/routes/` |
| Middleware | `api/src/middleware/` |
| Business services | `api/src/services/` |
| Utilities | `api/src/utils/` |
| WebSocket | `api/src/websocket/` |

## Route Registration

All routes are registered in `server.js`:

```javascript
// Public routes
app.use("/api/auth", auth);
app.use("/api/health", health);

// Protected routes (require authentication)
app.use("/api/employees", requireAuth, employees);
app.use("/api/payroll-v2", requireAuth, payrollV2);
app.use("/api/timecards", requireAuth, timecards);
// ... etc
```

## API Routes

### Core Business Routes

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| employees.js | `/api/employees` | Employee CRUD, profiles | [employees.md](./routes/employees.md) |
| payroll-v2.js | `/api/payroll-v2` | Automated payroll, vacation | [payroll-v2.md](./routes/payroll-v2.md) |
| payroll.js | `/api/payroll` | Legacy payroll (deprecated) | [payroll.md](./routes/payroll.md) |
| timecards.js | `/api/timecards` | Timecard management | [timecards.md](./routes/timecards.md) |
| timecardUploads.js | `/api/timecard-uploads` | Excel upload/import | [timecard-uploads.md](./routes/timecard-uploads.md) |
| leave.js | `/api/leave` | Leave balances, calendar | [leave.md](./routes/leave.md) |
| leave-requests.js | `/api/leave-requests` | Leave request workflow | [leave-requests.md](./routes/leave-requests.md) |
| bonuses.js | `/api/bonuses` | Bonus management | [bonuses.md](./routes/bonuses.md) |
| commissions.js | `/api/commissions` | Commission data | [commissions.md](./routes/commissions.md) |
| compliance.js | `/api/compliance` | Compliance alerts | [compliance.md](./routes/compliance.md) |

### Auth & User Routes

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| auth-mfa.js | `/api/auth` | Login, logout, MFA | [auth-mfa.md](./routes/auth-mfa.md) |
| users.js | `/api/users` | User management | [users.md](./routes/users.md) |
| trusted-devices.js | `/api/trusted-devices` | MFA device trust | [trusted-devices.md](./routes/trusted-devices.md) |
| settings.js | `/api/settings` | User/system settings | [settings.md](./routes/settings.md) |

### Analytics & Metrics

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| analytics.js | `/api/analytics` | Dashboard analytics | [analytics.md](./routes/analytics.md) |
| metrics.js | `/api/metrics` | System metrics | [metrics.md](./routes/metrics.md) |

### Sales & Commissions

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| sales-commissions.js | `/api/sales-commissions` | Sales commission calc | [sales-commissions.md](./routes/sales-commissions.md) |
| revenue-comparison.js | `/api/revenue-comparison` | Revenue comparison | [revenue-comparison.md](./routes/revenue-comparison.md) |
| employee-matching.js | `/api/employee-matching` | Match employees across data | [employee-matching.md](./routes/employee-matching.md) |

### Admin & System

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| admin.js | `/api/admin` | Admin operations | [admin.md](./routes/admin.md) |
| admin-cleanup.js | `/api/admin-cleanup` | Data cleanup | [admin-cleanup.md](./routes/admin-cleanup.md) |
| imports.js | `/api/imports` | File imports | [imports.md](./routes/imports.md) |
| migrate.js | `/api/migrate` | DB migrations | [migrate.md](./routes/migrate.md) |
| health.js | `/health` | Health check | [health.md](./routes/health.md) |
| diagnostic.js | `/api/diagnostic` | Diagnostics | [diagnostic.md](./routes/diagnostic.md) |

### Communication

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| notifications.js | `/api/notifications` | User notifications | [notifications.md](./routes/notifications.md) |
| chat.js | `/api/chat` | Chat/messaging | [chat.md](./routes/chat.md) |

### Other

| Route Module | Path | Description | Doc |
|--------------|------|-------------|-----|
| termination.js | `/api/termination` | Employee termination | [termination.md](./routes/termination.md) |
| update-credentials.js | `/api/admin/update-all-credentials` | Credential updates | [update-credentials.md](./routes/update-credentials.md) |
| payroll-simple.js | `/api/payroll-simple` | Simple payroll calc | [payroll-simple.md](./routes/payroll-simple.md) |

## Middleware Stack

Applied in order in `server.js`:

| Middleware | Purpose | Doc |
|------------|---------|-----|
| security.securityHeaders | Security headers (CSP, HSTS) | [security.md](./middleware/security.md) |
| security.corsSecurity | CORS configuration | [security.md](./middleware/security.md) |
| security.sqlInjectionPrevention | SQL injection protection | [security.md](./middleware/security.md) |
| security.sanitizeInput | XSS prevention | [security.md](./middleware/security.md) |
| security.requestSizeLimit | Request body size limits | [security.md](./middleware/security.md) |
| security.auditLog | Request logging | [security.md](./middleware/security.md) |
| security.sessionSecurity | Session hardening | [security.md](./middleware/security.md) |
| security.apiRateLimit | General rate limiting | [security.md](./middleware/security.md) |
| requireAuth | Session authentication | [auth.md](./middleware/auth.md) |
| rbac | Role-based access control | [rbac.md](./middleware/rbac.md) |
| validation | Request validation (Zod) | [validation.md](./middleware/validation.md) |

## Services

| Service | Purpose | Doc |
|---------|---------|-----|
| email.js | Send emails (Nodemailer) | [email.md](./services/email.md) |
| mfa.js | TOTP MFA | [mfa.md](./services/mfa.md) |
| notifications.js | Notification service | [notifications.md](./services/notifications.md) |
| trusted-devices.js | Device trust management | [trusted-devices.md](./services/trusted-devices.md) |
| user-management.js | User CRUD operations | [user-management.md](./services/user-management.md) |
| encryption.js | Field encryption | [encryption.md](./services/encryption.md) |

## Utilities

Key utility modules:

| Utility | Purpose | Doc |
|---------|---------|-----|
| excelParser.js | Parse Excel files | [excel-parser.md](./utils/excel-parser.md) |
| unifiedFileParser.js | Generic file parsing | [unified-file-parser.md](./utils/unified-file-parser.md) |
| timecardImporter.js | Import timecard data | [timecard-importer.md](./utils/timecard-importer.md) |
| commissionImporter.js | Import commission data | [commission-importer.md](./utils/commission-importer.md) |
| employeeMatching.js | Match employee names | [employee-matching.md](./utils/employee-matching.md) |
| fileValidation.js | Validate uploaded files | [file-validation.md](./utils/file-validation.md) |
| logger.js | Logging utility | [logger.md](./utils/logger.md) |
| security.js | Security utilities | [security-utils.md](./utils/security-utils.md) |

## Error Handling

Global error handler in `server.js`:

```javascript
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", error);
  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    timestamp: new Date().toISOString()
  });
});
```

All routes should throw errors with appropriate status codes:
- `400` - Bad request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not allowed)
- `404` - Not found
- `500` - Server error

## Database Access

Database access via `api/src/db.js`:

```javascript
import { q } from "./db.js";

// Simple query
const { rows } = await q("SELECT * FROM employees WHERE id = $1", [id]);

// With pools for read/write separation
import { primaryPool, readerPool, timedQuery } from "./db/pools.js";
```

## WebSocket Server

WebSocket server in `api/src/websocket/server.js`:
- Handles real-time chat
- Push notifications
- Initialized when HTTP server starts

---

*Last verified: January 2026*
