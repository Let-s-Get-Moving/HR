# Database Documentation

> **Source**: `db/`

The system uses PostgreSQL as the primary data store. Schema is defined via SQL migration files.

## Connection

```javascript
// api/src/db.js
const connectionString = process.env.DATABASE_URL || 
  "postgresql://hr:hrpass@localhost:5432/hrcore";
```

Default local credentials:
- **Host**: localhost:5432
- **Database**: hrcore
- **User**: hr
- **Password**: hrpass

## Schema Files

Schema migrations are in `db/init/` and executed in alphanumeric order:

| File | Purpose |
|------|---------|
| 001_schema.sql | Core tables (employees, departments, locations) |
| 002_seed.sql | Seed data |
| 003_leave_management.sql | Leave tables |
| 004_workforce_analytics.sql | Analytics views |
| 005_termination_schema.sql | Termination tracking |
| 006_payroll_schema.sql | Legacy payroll |
| 007_hr_extensions.sql | HR extensions |
| 008_performance_leave_tables.sql | Performance reviews |
| 010_simple_auth.sql | Users and sessions |
| 022_bonuses_commissions.sql | Bonuses/commissions |
| 025_multi_user_rbac.sql | RBAC roles |
| 026_mfa_totp.sql | MFA tables |
| 030_timecards_schema.sql | Timecard tables |
| 050_payroll_rework_schema.sql | Payroll V2 tables |

## Core Tables

### employees

Main employee data.

```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    work_email VARCHAR(255),
    phone VARCHAR(20),
    hire_date DATE,
    termination_date DATE,
    status VARCHAR(50) DEFAULT 'Active',
    employment_type VARCHAR(50),
    department_id INTEGER REFERENCES departments(id),
    location_id INTEGER REFERENCES locations(id),
    hourly_rate NUMERIC(10,2),
    role_title VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### users

Login accounts (linked to employees for non-admin users).

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    employee_id INTEGER REFERENCES employees(id),
    role_id INTEGER REFERENCES hr_roles(id),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_sessions

Active login sessions.

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

### hr_roles

RBAC role definitions.

```sql
CREATE TABLE hr_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    permissions JSONB,
    scope VARCHAR(20) DEFAULT 'own'
);

-- Default roles
INSERT INTO hr_roles (role_name, display_name, scope) VALUES
('admin', 'Administrator', 'all'),
('manager', 'Manager', 'all'),
('user', 'User', 'own');
```

### timecards

Timecard headers per employee/period.

```sql
CREATE TABLE timecards (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    total_hours NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    status VARCHAR(50) DEFAULT 'Draft',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);
```

### timecard_entries

Individual clock in/out records.

```sql
CREATE TABLE timecard_entries (
    id SERIAL PRIMARY KEY,
    timecard_id INTEGER REFERENCES timecards(id),
    employee_id INTEGER REFERENCES employees(id),
    work_date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    hours_worked NUMERIC(5,2),
    is_overtime BOOLEAN DEFAULT FALSE,
    notes TEXT
);
```

### payrolls (V2)

Automated payroll records.

```sql
CREATE TABLE payrolls (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    regular_hours NUMERIC(10,2) DEFAULT 0,
    overtime_hours NUMERIC(10,2) DEFAULT 0,
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    regular_pay NUMERIC(10,2) DEFAULT 0,
    overtime_pay NUMERIC(10,2) DEFAULT 0,
    gross_pay NUMERIC(10,2) DEFAULT 0,
    vacation_hours_accrued NUMERIC(10,2) DEFAULT 0,
    vacation_pay_accrued NUMERIC(10,2) DEFAULT 0,
    deductions NUMERIC(10,2) DEFAULT 0,
    net_pay NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);
```

### employee_vacation_balance

Vacation accrual tracking.

```sql
CREATE TABLE employee_vacation_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE,
    vacation_hours_earned NUMERIC(10,2) DEFAULT 0,
    vacation_hours_paid NUMERIC(10,2) DEFAULT 0,
    vacation_hours_balance NUMERIC(10,2) DEFAULT 0,
    vacation_pay_earned NUMERIC(10,2) DEFAULT 0,
    vacation_pay_paid NUMERIC(10,2) DEFAULT 0,
    vacation_pay_balance NUMERIC(10,2) DEFAULT 0
);
```

### leave_requests

Leave request workflow.

```sql
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested NUMERIC(5,2),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### compliance_alerts

Document/permit expiration alerts.

```sql
CREATE TABLE compliance_alerts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    alert_type VARCHAR(100),
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'Active',
    resolved_at TIMESTAMP,
    resolved_by INTEGER
);
```

## Key Indexes

```sql
-- Employee lookups
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department_id);

-- Session lookups
CREATE INDEX idx_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Timecard queries
CREATE INDEX idx_timecards_employee ON timecards(employee_id);
CREATE INDEX idx_timecards_period ON timecards(pay_period_start, pay_period_end);
CREATE INDEX idx_timecard_entries_timecard ON timecard_entries(timecard_id);
CREATE INDEX idx_timecard_entries_date ON timecard_entries(work_date);

-- Payroll queries
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX idx_payrolls_period ON payrolls(pay_period_start, pay_period_end);
```

## Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Auto-calculate overtime

```sql
-- Marks entries as overtime when hours > 8 in a day
CREATE TRIGGER trigger_auto_overtime
    BEFORE INSERT OR UPDATE ON timecard_entries
    FOR EACH ROW EXECUTE FUNCTION auto_mark_overtime();
```

### Vacation balance update

```sql
-- Updates vacation balance when payroll is approved
CREATE TRIGGER trigger_update_vacation_balance
    AFTER INSERT OR UPDATE OF status ON payrolls
    FOR EACH ROW
    WHEN (NEW.status = 'Approved')
    EXECUTE FUNCTION update_vacation_balance_from_payroll();
```

## Running Migrations

### Local (Docker)

```bash
# Migrations run automatically on container start
docker compose -f config/docker-compose.yml up -d

# Manual migration
docker exec -i hr-db-1 psql -U hr -d hrcore < db/init/new_migration.sql
```

### Production (Render)

```bash
# Set DATABASE_URL to production
export DATABASE_URL="postgresql://..."

# Run migration
psql $DATABASE_URL < db/init/new_migration.sql

# Or use the API migration endpoint
curl -X POST https://api.example.com/api/migrate-db
```

See [migrations.md](./migrations.md) for detailed migration procedures.

## Backup & Restore

### Backup

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore

```bash
psql $DATABASE_URL < backup.sql
```

## Database Management UI

Adminer is available at http://localhost:8081

- **Server**: db (or localhost if connecting from host)
- **Username**: hr
- **Password**: hrpass
- **Database**: hrcore

---

*Last verified: January 2026*
