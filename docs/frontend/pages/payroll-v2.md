# PayrollV2 Page

> **Source**: `web/src/pages/PayrollV2.jsx`

Automated payroll management with vacation tracking.

## Overview

The PayrollV2 page provides:
- Pay period overview with totals
- Employee payroll details
- Vacation balance management
- Vacation payouts

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | View own payroll only |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/payroll-v2 | List payroll records |
| GET /api/payroll-v2/periods/list | Pay periods |
| GET /api/payroll-v2/next-pay-period | Next period info |
| GET /api/payroll-v2/vacation/balances | Vacation balances |
| GET /api/payroll-v2/vacation/balance/:id | Employee balance |
| POST /api/payroll-v2/vacation/payout | Process payout |

## Tabs

### Overview

Summary cards:
- Next pay date
- Total employees in period
- Total gross pay
- Total vacation accrued

Period list showing:
- All historical pay periods
- Employee count per period
- Total amounts

### Pay Period Detail

Selected period showing:
- Employee breakdown
- Hours (regular + overtime)
- Pay (regular + overtime + gross)
- Vacation accrued
- Status

### Vacation Balances

All employees with:
- Hours earned/paid/balance
- Pay earned/paid/balance
- Current hourly rate
- Payout button

### Vacation Payout

Process payout form:
- Select employee
- Enter hours to pay out
- Payout date
- Notes
- Submit

Validation:
- Cannot exceed balance
- Calculates amount at current rate

## Components Used

- `Table` - Data tables
- `Modal` - Payout dialog
- `DatePicker` - Date selection

## State

```jsx
const [activeTab, setActiveTab] = useState("overview");
const [periods, setPeriods] = useState([]);
const [selectedPeriod, setSelectedPeriod] = useState(null);
const [payrolls, setPayrolls] = useState([]);
const [vacationBalances, setVacationBalances] = useState([]);
const [showPayoutModal, setShowPayoutModal] = useState(false);
const [selectedEmployee, setSelectedEmployee] = useState(null);
const [payoutHours, setPayoutHours] = useState("");
```

## Payroll Calculation Display

Shows per employee:
```
Regular Hours × Hourly Rate = Regular Pay
Overtime Hours × Hourly Rate × 1.5 = Overtime Pay
─────────────────────────────────────────────
Gross Pay = Regular Pay + Overtime Pay

Vacation Accrued = Gross Pay × 4%
```

## Vacation Payout Flow

1. Click "Pay Out" on employee
2. Modal shows current balance
3. Enter hours to pay out
4. Amount calculated automatically
5. Submit processes payout
6. Balance updated

## Period Selection

Dropdown to select pay period:
- Shows all available periods
- Format: "2025-09-27 - 2025-10-10"
- Loads payrolls for selected period

## Related

- [Payroll V2 API](../../backend/routes/payroll-v2.md)
- [Payroll System Documentation](../../PAYROLL_SYSTEM_V2.md) (legacy doc)

---

*Last verified: January 2026*
