# HR Management System Documentation

This is the **single entry point** for all documentation. Start here and navigate to specific docs as needed.

## Quick Links

| Need to... | Go to |
|------------|-------|
| Understand the system architecture | [System Overview](./01_system_overview.md) |
| Set up local development | [Local Development](./ops/local-dev.md) |
| Deploy to production | [Deployment Guide](./ops/deployment.md) |
| Understand the API | [Backend Overview](./backend/README.md) |
| Understand the UI | [Frontend Overview](./frontend/README.md) |
| Check auth/security | [Security & Auth](./security/README.md) |
| Run tests | [Testing Guide](./testing/README.md) |
| Find a specific doc | [Coverage Checklist](./coverage.md) |

## Documentation Structure

```
docs/
├── README.md                    # You are here
├── 00_conventions.md            # Doc conventions, how to update docs
├── 01_system_overview.md        # Architecture, data flows, environments
├── coverage.md                  # Coverage checklist - what's documented
│
├── backend/                     # Backend (Node.js/Express API)
│   ├── README.md                # Backend overview, route wiring
│   ├── routes/                  # One doc per route module
│   │   ├── employees.md
│   │   ├── payroll-v2.md
│   │   ├── timecards.md
│   │   └── ...
│   ├── middleware/              # Security, RBAC, validation
│   ├── services/                # Email, MFA, notifications
│   └── utils/                   # Importers, parsers, helpers
│
├── frontend/                    # Frontend (React/Vite)
│   ├── README.md                # Frontend architecture, navigation
│   ├── pages/                   # One doc per page component
│   │   ├── dashboard.md
│   │   ├── employees.md
│   │   └── ...
│   ├── components/              # Shared UI components
│   ├── hooks/                   # Custom React hooks
│   └── utils/                   # API client, session, validation
│
├── database/                    # Database (PostgreSQL)
│   ├── README.md                # Schema overview, key tables
│   └── migrations.md            # How to run migrations
│
├── security/                    # Security & Authentication
│   ├── README.md                # Security model overview
│   ├── authentication.md        # Login, sessions, MFA
│   └── rbac.md                  # Role-based access control
│
├── ops/                         # Operations & Deployment
│   ├── local-dev.md             # Local development setup
│   ├── docker.md                # Docker configuration
│   └── deployment.md            # Production deployment (Render)
│
├── testing/                     # Testing
│   └── README.md                # Test strategy, how to run tests
│
└── legacy/                      # Superseded docs (kept for links)
    └── ...
```

## System at a Glance

**HR Management System** - A full-stack HR application for employee management, payroll, timecards, leave management, and compliance tracking.

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | React 18 + Vite + Tailwind | `web/` |
| Backend | Node.js + Express | `api/` |
| Database | PostgreSQL | `db/` |
| Deployment | Docker + Render | `config/` |

### Key Features

- **Employee Management** - Profiles, documents, onboarding/offboarding
- **Payroll V2** - Automated payroll from approved timecards, vacation accrual
- **Time Tracking** - Excel import, multiple punches per day, overtime detection
- **Leave Management** - Request/approval workflow, balance tracking
- **Bonuses & Commissions** - Sales commission calculations, bonus management
- **Compliance** - SIN/permit expiration alerts, training tracking
- **RBAC** - Admin, Manager, User roles with scoped access
- **MFA** - Optional TOTP-based two-factor authentication

### Running Locally

```bash
# Start all services
docker compose -f config/docker-compose.yml up -d

# Access points
# Web App:  http://localhost:5173
# API:      http://localhost:8080
# Adminer:  http://localhost:8081
```

See [Local Development](./ops/local-dev.md) for detailed setup instructions.

## Contributing to Docs

Before adding or editing documentation, read [Conventions](./00_conventions.md) for:
- Doc templates and required sections
- Naming conventions
- How to keep docs in sync with code
- When to mark docs as legacy

## Legacy Documentation

The `docs/` folder contains many older markdown files from previous development phases. These are preserved to avoid breaking links but may be outdated.

**How to identify legacy docs:**
- Files with `_COMPLETE`, `_STATUS`, `_FIX`, `_SUMMARY` suffixes are usually implementation notes
- Files without the standard template structure
- Files not linked from this README or coverage.md

When in doubt, check [coverage.md](./coverage.md) for the canonical doc for any topic.

---

*Last updated: January 2026*
