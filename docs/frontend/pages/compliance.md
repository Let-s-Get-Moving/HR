# Compliance Page

> **Source**: `web/src/pages/Compliance.jsx`

Compliance monitoring and alert management.

## Overview

The Compliance page provides:
- Active compliance alerts
- Alert resolution workflow
- Compliance statistics
- Document expiration tracking

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | Not accessible |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/compliance/alerts | List alerts |
| POST /api/compliance/generate-alerts | Generate alerts |
| PUT /api/compliance/alerts/:id/resolve | Resolve alert |
| GET /api/compliance/stats | Statistics |

## UI Sections

### Summary Cards

Top metrics:
- Total Active Alerts
- SIN Expiries
- Work Permit Expiries
- Contract Expiries
- Training Expiries

### Alerts Table

Table columns:
- Employee Name
- Alert Type
- Description
- Due Date
- Days Remaining
- Status
- Actions (Resolve)

### Filter Options

Filter by:
- Alert type
- Status (Active, Resolved)
- Urgency (Overdue, Due Soon)

## Alert Types

| Type | Icon | Description |
|------|------|-------------|
| SIN_EXPIRY | ID card | Social Insurance Number expiring |
| WORK_PERMIT_EXPIRY | Passport | Work permit expiring |
| CONTRACT_EXPIRY | Document | Employment contract expiring |
| TRAINING_EXPIRY | Certificate | Required training expired |

## Alert Resolution

1. Click "Resolve" on alert
2. Enter resolution notes
3. Submit marks as resolved
4. Alert moves to resolved list

## Generate Alerts

Button to scan for new alerts:
- Checks all employees
- Creates alerts for upcoming expirations
- Shows count of new alerts created

## Urgency Indicators

Visual indicators:
- **Red**: Overdue (past due date)
- **Orange**: Due within 7 days
- **Yellow**: Due within 30 days
- **Green**: Due in 30+ days

## Components Used

- `MetricCard` - Summary metrics
- `Table` - Alerts table
- `Modal` - Resolution dialog

## State

```jsx
const [alerts, setAlerts] = useState([]);
const [stats, setStats] = useState(null);
const [filter, setFilter] = useState("active");
const [typeFilter, setTypeFilter] = useState("all");
const [loading, setLoading] = useState(true);
```

## Related

- [Compliance API](../../backend/routes/compliance.md)

---

*Last verified: January 2026*
