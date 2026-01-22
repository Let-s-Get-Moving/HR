# Bonuses & Commissions Page

> **Source**: `web/src/pages/BonusesCommissions.jsx`

Bonus and commission management interface.

## Overview

The Bonuses & Commissions page provides:
- View bonuses for employees
- View monthly commission data
- Commission calculations and breakdowns
- Sales performance metrics

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | View own data only |
| Sales roles | Additional access to commission details |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/bonuses | List bonuses |
| POST /api/bonuses | Create bonus |
| PUT /api/bonuses/:id/approve | Approve bonus |
| GET /api/commissions/monthly | Monthly commissions |
| GET /api/commissions/periods | Commission periods |
| GET /api/sales-commissions/calculate | Calculate commissions |

## Tabs

### Bonuses

Table of bonus records:
- Employee name
- Bonus type
- Amount
- Status (Pending, Approved)
- Effective date
- Approve button (managers)

### Commissions

Monthly commission view:
- Select pay period
- Employee commission amounts
- Deal counts
- Totals

### Sales Performance (Sales roles)

Detailed sales metrics:
- Revenue comparison
- Lead status
- Performance rankings

## Components Used

- `CommissionLegend` - Legend for commission tiers
- `Table` - Data tables
- `Modal` - Forms

## State

```jsx
const [activeTab, setActiveTab] = useState("bonuses");
const [bonuses, setBonuses] = useState([]);
const [commissions, setCommissions] = useState([]);
const [selectedPeriod, setSelectedPeriod] = useState(null);
const [periods, setPeriods] = useState([]);
```

## Bonus Creation

Form to create new bonus:
- Employee selection
- Bonus type
- Amount
- Reason
- Effective date

Status starts as "Pending" until approved.

## Commission Periods

Dropdown to select period:
- Shows available commission periods
- Loads data for selected period

## RBAC Filtering

- **User role**: Only sees own bonuses/commissions
- **Sales role**: Additional access based on `salesRole` field
- **Manager/Admin**: Sees all data

## Related

- [Bonuses API](../../backend/routes/bonuses.md)
- [Commissions API](../../backend/routes/commissions.md)
- [Sales Commissions API](../../backend/routes/sales-commissions.md)

---

*Last verified: January 2026*
