# System Overview

This document describes the architecture, data flows, and key design decisions of the HR Management System.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│                    http://localhost:5173                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend (Vite)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Dashboard  │  │  Employees  │  │  Payroll    │  ...        │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Shared: apiClient, sessionManager, hooks       │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express.js API Server                         │
│                    http://localhost:8080                        │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Middleware: security, rbac, validation, auth   │           │
│  └─────────────────────────────────────────────────┘           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  /employees │  │  /payroll   │  │  /timecards │  ...        │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Services: email, mfa, notifications            │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL (pg driver)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                        │
│                    localhost:5432/hrcore                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  employees  │  │  payrolls   │  │  timecards  │  ...        │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React | 18.x | UI framework |
| Frontend | Vite | 5.x | Build tool, dev server |
| Frontend | Tailwind CSS | 3.x | Styling |
| Frontend | Framer Motion | 11.x | Animations |
| Backend | Node.js | 18+ | Runtime |
| Backend | Express | 4.x | HTTP framework |
| Backend | pg | 8.x | PostgreSQL driver |
| Database | PostgreSQL | 15+ | Primary data store |
| Ops | Docker Compose | - | Local development |
| Ops | Render | - | Production hosting |

## Project Structure

```
HR/
├── api/                         # Backend API
│   ├── src/
│   │   ├── server.js            # Express app setup
│   │   ├── db.js                # Database connection
│   │   ├── session.js           # Session management
│   │   ├── routes/              # API route handlers (32 files)
│   │   ├── middleware/          # Express middleware (7 files)
│   │   ├── services/            # Business logic services (6 files)
│   │   ├── utils/               # Utility functions (24 files)
│   │   └── websocket/           # WebSocket server
│   ├── migrations/              # Ad-hoc migration scripts
│   └── package.json
│
├── web/                         # Frontend
│   ├── src/
│   │   ├── App.jsx              # Main app, routing, navigation
│   │   ├── pages/               # Page components (13 files)
│   │   ├── components/          # Shared UI components (40+ files)
│   │   ├── hooks/               # Custom React hooks (4 files)
│   │   ├── utils/               # Client utilities (15 files)
│   │   ├── config/              # API configuration
│   │   └── i18n/                # Internationalization
│   └── package.json
│
├── db/                          # Database
│   ├── init/                    # Schema migrations (60+ files)
│   └── migrations/              # Feature migrations
│
├── config/                      # Deployment configs
│   ├── docker-compose.yml       # Production compose
│   ├── docker-compose.dev.yml   # Development compose
│   ├── Dockerfile               # API container
│   └── render.yaml              # Render deployment
│
├── tests/                       # Test files (50+ files)
├── docs/                        # Documentation (this folder)
└── package.json                 # Root dependencies
```

## Key Data Flows

### 1. Authentication Flow

```
User submits login form
        │
        ▼
POST /api/auth/login
        │
        ├─ Validate credentials (bcrypt)
        ├─ Check MFA if enabled
        ├─ Create session in user_sessions table
        ├─ Set session cookie (HTTP-only)
        │
        ▼
Session validated on subsequent requests via requireAuth middleware
```

### 2. Timecard → Payroll Flow

```
HR uploads Excel timecard file
        │
        ▼
POST /api/timecard-uploads/upload
        │
        ├─ Parse Excel (unified parser)
        ├─ Match employees by name
        ├─ Create/update timecard records
        ├─ Create timecard_entries for each punch
        │
        ▼
Timecards reviewed and approved (status: Approved)
        │
        ▼
POST /api/payroll-v2/generate
        │
        ├─ Fetch approved timecards for period
        ├─ Calculate pay: hours × rate
        ├─ Calculate overtime: OT hours × rate × 1.5
        ├─ Calculate vacation accrual: 4%
        ├─ Create payroll records (status: Draft)
        │
        ▼
Payroll approved → Payroll paid
```

### 3. Leave Request Flow

```
Employee submits leave request
        │
        ▼
POST /api/leave-requests
        │
        ├─ Validate dates and balance
        ├─ Create request (status: Pending)
        │
        ▼
Manager/Admin reviews
        │
        ▼
PUT /api/leave-requests/:id/status
        │
        ├─ Update status (Approved/Rejected)
        ├─ If approved, update leave balance
        │
        ▼
Employee sees updated status
```

## Authentication & Authorization

### Session-Based Auth

- Sessions stored in `user_sessions` table
- Session ID in HTTP-only cookie
- 8-hour default session duration
- Extended on activity

### Role-Based Access Control (RBAC)

| Role | Scope | Description |
|------|-------|-------------|
| Admin | all | Full system access |
| Manager | all | Full access, can approve requests |
| User | own | Limited to own data only |

### MFA (Optional)

- TOTP-based (Google Authenticator compatible)
- Enabled per-user in settings
- Trusted devices can skip MFA

See [Security Documentation](./security/README.md) for details.

## Database Design

### Core Tables

| Table | Purpose |
|-------|---------|
| `employees` | Employee master data |
| `users` | Login accounts (linked to employees) |
| `user_sessions` | Active sessions |
| `hr_roles` | Role definitions |
| `timecards` | Timecard headers per employee/period |
| `timecard_entries` | Individual clock in/out records |
| `payrolls` | Payroll records (V2 system) |
| `employee_vacation_balance` | Vacation accrual tracking |
| `leave_requests` | Leave request workflow |
| `compliance_alerts` | Expiration alerts |
| `bonuses` | Bonus records |
| `agent_commission_monthly` | Commission data |

See [Database Documentation](./database/README.md) for full schema.

## Environment Variables

### Required (API)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://hr:pass@localhost:5432/hrcore` |
| `PORT` | API server port | `8080` |
| `NODE_ENV` | Environment | `development` or `production` |

### Optional (API)

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_SECRET` | Session signing key | Auto-generated |
| `FORCE_PRIMARY_READS` | Skip replica for reads | `false` |
| `DEBUG_DATA_DRIFT` | Enable debug endpoints | `false` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080` |

## Deployment Environments

### Local Development

- Docker Compose runs all services
- Hot reload enabled for both frontend and backend
- Database persisted in Docker volume
- See [Local Development](./ops/local-dev.md)

### Production (Render)

- API deployed as web service
- Frontend deployed as static site
- PostgreSQL managed database
- See [Deployment Guide](./ops/deployment.md)

## Key Integrations

### Excel Import

The system imports data from Excel files:
- **Timecards**: Employee time tracking data
- **Commissions**: Sales commission data
- **Booked Opportunities**: Sales performance data

Uses `xlsx` library with custom parsers in `api/src/utils/`.

### WebSocket

Real-time features use WebSocket:
- Chat/messaging
- Notifications

Server in `api/src/websocket/server.js`.

### Email (Planned)

Email service configured in `api/src/services/email.js` using Nodemailer.

---

*Last verified: January 2026*
