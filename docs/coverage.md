# Documentation Coverage Checklist

This document tracks documentation coverage for all major modules.

## Legend

- ✅ Documented
- ⏳ Partial / needs update
- ❌ Not documented

---

## Backend Routes (api/src/routes/)

| Module | File | Status | Doc Link |
|--------|------|--------|----------|
| Admin | admin.js | ⏳ | - |
| Admin Cleanup | admin-cleanup.js | ⏳ | - |
| Analytics | analytics.js | ✅ | [analytics.md](./backend/routes/analytics.md) |
| Auth (MFA) | auth-mfa.js | ✅ | [auth-mfa.md](./backend/routes/auth-mfa.md) |
| Auth | auth.js | ⏳ | See auth-mfa.md |
| Bonuses | bonuses.js | ✅ | [bonuses.md](./backend/routes/bonuses.md) |
| Chat | chat.js | ✅ | [chat.md](./backend/routes/chat.md) |
| Commissions | commissions.js | ✅ | [commissions.md](./backend/routes/commissions.md) |
| Compliance | compliance.js | ✅ | [compliance.md](./backend/routes/compliance.md) |
| Diagnostic | diagnostic.js | ⏳ | - |
| Employee Matching | employee-matching.js | ⏳ | - |
| Employees Enhanced | employees-enhanced.js | ⏳ | See employees.md |
| Employees | employees.js | ✅ | [employees.md](./backend/routes/employees.md) |
| Health | health.js | ✅ | [health.md](./backend/routes/health.md) |
| Imports | imports.js | ✅ | [imports.md](./backend/routes/imports.md) |
| Leave Requests | leave-requests.js | ✅ | [leave-requests.md](./backend/routes/leave-requests.md) |
| Leave | leave.js | ✅ | [leave.md](./backend/routes/leave.md) |
| Metrics | metrics.js | ⏳ | - |
| Migrate | migrate.js | ⏳ | - |
| Notifications | notifications.js | ✅ | [notifications.md](./backend/routes/notifications.md) |
| Payroll Simple | payroll-simple.js | ⏳ | - |
| Payroll V2 | payroll-v2.js | ✅ | [payroll-v2.md](./backend/routes/payroll-v2.md) |
| Payroll | payroll.js | ⏳ | Legacy, see payroll-v2.md |
| Revenue Comparison | revenue-comparison.js | ⏳ | - |
| Sales Commissions | sales-commissions.js | ⏳ | - |
| Settings | settings.js | ✅ | [settings.md](./backend/routes/settings.md) |
| Termination | termination.js | ✅ | [termination.md](./backend/routes/termination.md) |
| Timecards | timecards.js | ✅ | [timecards.md](./backend/routes/timecards.md) |
| Timecard Uploads | timecardUploads.js | ✅ | [timecard-uploads.md](./backend/routes/timecard-uploads.md) |
| Trusted Devices | trusted-devices.js | ⏳ | - |
| Update Credentials | update-credentials.js | ⏳ | - |
| Users | users.js | ✅ | [users.md](./backend/routes/users.md) |

**Coverage: 19/32 (59%)**

---

## Backend Middleware (api/src/middleware/)

| Module | File | Status | Doc Link |
|--------|------|--------|----------|
| Account Lockout | account-lockout.js | ⏳ | - |
| CSRF | csrf.js | ⏳ | - |
| Encryption | encryption.js | ⏳ | - |
| RBAC | rbac.js | ✅ | [rbac.md](./backend/middleware/rbac.md) |
| Security Simple | security-simple.js | ⏳ | - |
| Security | security.js | ✅ | [security.md](./backend/middleware/security.md) |
| Validation | validation.js | ✅ | [validation.md](./backend/middleware/validation.md) |

**Coverage: 3/7 (43%)**

---

## Backend Services (api/src/services/)

| Module | File | Status | Doc Link |
|--------|------|--------|----------|
| Email | email.js | ⏳ | - |
| Encryption | encryption.js | ⏳ | - |
| MFA | mfa.js | ✅ | [mfa.md](./backend/services/mfa.md) |
| Notifications | notifications.js | ⏳ | - |
| Trusted Devices | trusted-devices.js | ⏳ | - |
| User Management | user-management.js | ⏳ | - |

**Coverage: 1/6 (17%)**

---

## Backend Utils (api/src/utils/)

| Module | File | Status | Doc Link |
|--------|------|--------|----------|
| Excel Parser | excelParser.js | ✅ | [excel-parser.md](./backend/utils/excel-parser.md) |
| Employee Matching | employeeMatching.js | ✅ | [employee-matching.md](./backend/utils/employee-matching.md) |
| Unified File Parser | unifiedFileParser.js | ✅ | See excel-parser.md |
| Timecard Importer | timecardImporter.js | ⏳ | - |
| Commission Importer | commissionImporter.js | ⏳ | - |
| Logger | logger.js | ⏳ | - |
| Security | security.js | ⏳ | - |
| Date Utils | dateUtils.js | ⏳ | - |

**Coverage: 3/24 (13%)**

---

## Frontend Pages (web/src/pages/)

| Page | File | Status | Doc Link |
|------|------|--------|----------|
| Dashboard | Dashboard.jsx | ✅ | [dashboard.md](./frontend/pages/dashboard.md) |
| Employees | Employees.jsx | ✅ | [employees.md](./frontend/pages/employees.md) |
| Employee Profile | EmployeeProfile.jsx | ⏳ | See employees.md |
| Time Tracking | TimeTracking.jsx | ✅ | [time-tracking.md](./frontend/pages/time-tracking.md) |
| Leave Management | LeaveManagement.jsx | ✅ | [leave-management.md](./frontend/pages/leave-management.md) |
| Payroll | Payroll.jsx | ⏳ | Legacy, see payroll-v2.md |
| Payroll V2 | PayrollV2.jsx | ✅ | [payroll-v2.md](./frontend/pages/payroll-v2.md) |
| Bonuses & Commissions | BonusesCommissions.jsx | ✅ | [bonuses-commissions.md](./frontend/pages/bonuses-commissions.md) |
| Compliance | Compliance.jsx | ✅ | [compliance.md](./frontend/pages/compliance.md) |
| Messages | Messages.jsx | ✅ | [messages.md](./frontend/pages/messages.md) |
| Settings | Settings.jsx | ✅ | [settings.md](./frontend/pages/settings.md) |
| Login | Login.jsx | ⏳ | See authentication.md |
| Testing | Testing.jsx | ⏳ | Debug page |

**Coverage: 10/13 (77%)**

---

## Frontend Hooks (web/src/hooks/)

| Hook | File | Status | Doc Link |
|------|------|--------|----------|
| useForm | useForm.ts | ⏳ | - |
| usePerformance | usePerformance.js | ⏳ | - |
| useUserRole | useUserRole.js | ✅ | [use-user-role.md](./frontend/hooks/use-user-role.md) |
| useWebSocket | useWebSocket.js | ⏳ | - |

**Coverage: 1/4 (25%)**

---

## Frontend Utils (web/src/utils/)

| Utility | File | Status | Doc Link |
|---------|------|--------|----------|
| API Client | apiClient.ts | ✅ | [api-client.md](./frontend/utils/api-client.md) |
| Session Manager | sessionManager.js | ✅ | [session-manager.md](./frontend/utils/session-manager.md) |
| Validation | validation.ts | ⏳ | - |
| Timezone | timezone.js | ⏳ | - |
| Error Handler | errorHandler.ts | ⏳ | - |

**Coverage: 2/15 (13%)**

---

## Core Documentation

| Document | Status | Link |
|----------|--------|------|
| Main README (entry point) | ✅ | [README.md](./README.md) |
| Conventions | ✅ | [00_conventions.md](./00_conventions.md) |
| System Overview | ✅ | [01_system_overview.md](./01_system_overview.md) |
| Backend README | ✅ | [backend/README.md](./backend/README.md) |
| Frontend README | ✅ | [frontend/README.md](./frontend/README.md) |
| Database README | ✅ | [database/README.md](./database/README.md) |
| Database Migrations | ✅ | [database/migrations.md](./database/migrations.md) |
| Security README | ✅ | [security/README.md](./security/README.md) |
| Authentication | ✅ | [security/authentication.md](./security/authentication.md) |
| RBAC | ✅ | [security/rbac.md](./security/rbac.md) |
| Local Dev | ✅ | [ops/local-dev.md](./ops/local-dev.md) |
| Docker | ✅ | [ops/docker.md](./ops/docker.md) |
| Deployment | ✅ | [ops/deployment.md](./ops/deployment.md) |
| Testing README | ✅ | [testing/README.md](./testing/README.md) |

**Coverage: 14/14 (100%)**

---

## Summary

| Category | Documented | Total | Percentage |
|----------|------------|-------|------------|
| Backend Routes | 19 | 32 | 59% |
| Backend Middleware | 3 | 7 | 43% |
| Backend Services | 1 | 6 | 17% |
| Backend Utils | 3 | 24 | 13% |
| Frontend Pages | 10 | 13 | 77% |
| Frontend Hooks | 1 | 4 | 25% |
| Frontend Utils | 2 | 15 | 13% |
| Core Docs | 14 | 14 | 100% |
| **Total** | **53** | **115** | **46%** |

**Note:** Core documentation (system overview, security, ops) is at 100%. Individual module docs are partially complete with the most important modules documented.

---

## Priority Items for Future Documentation

High priority (frequently used, complex):
1. Backend utils: timecardImporter.js, commissionImporter.js
2. Backend services: email.js, notifications.js
3. Frontend hooks: useWebSocket.js
4. Remaining route files with unique functionality

Medium priority:
1. Backend middleware: csrf.js, account-lockout.js
2. Frontend utils: validation.ts, timezone.js
3. Minor route files

Low priority (stable, rarely changed):
1. Debug/diagnostic endpoints
2. Legacy modules (old payroll)

---

*Last updated: January 2026*
