# Payroll V2 API

> **Source**: `api/src/routes/payroll-v2.js`

Automated payroll system that calculates pay from approved timecards with vacation accrual tracking.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/payroll-v2 | List payroll records | Required |
| GET | /api/payroll-v2/:id | Get specific payroll | Required |
| GET | /api/payroll-v2/periods/list | List all pay periods | Required |
| GET | /api/payroll-v2/summary/by-period | Get period summary | Required |
| GET | /api/payroll-v2/next-pay-period | Get next pay period dates | Required |
| GET | /api/payroll-v2/current-pay-period | Get current pay period dates | Required |
| GET | /api/payroll-v2/vacation/balances | List all vacation balances | Required |
| GET | /api/payroll-v2/vacation/balance/:employee_id | Get employee vacation balance | Required |
| POST | /api/payroll-v2/vacation/payout | Process vacation payout | Required |
| GET | /api/payroll-v2/vacation/payouts/:employee_id | Get payout history | Required |

## Payroll Records

### GET /api/payroll-v2

List payroll records with optional filters.

**Query Parameters:**
- `employee_id` - Filter by employee
- `pay_period_start` - Filter by period start (>=)
- `pay_period_end` - Filter by period end (<=)
- `start_date` - Filter by pay_date (>=)
- `end_date` - Filter by pay_date (<=)

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "department": "Operations",
    "pay_period_start": "2025-09-27",
    "pay_period_end": "2025-10-10",
    "pay_date": "2025-10-10",
    "regular_hours": 80.00,
    "overtime_hours": 5.00,
    "hourly_rate": 25.00,
    "regular_pay": 2000.00,
    "overtime_pay": 187.50,
    "gross_pay": 2187.50,
    "vacation_hours_accrued": 3.40,
    "vacation_pay_accrued": 87.50,
    "deductions": 0.00,
    "net_pay": 2187.50,
    "status": "Approved"
  }
]
```

### GET /api/payroll-v2/periods/list

List all unique pay periods.

**Response:**
```json
[
  {
    "pay_period_start": "2025-09-27",
    "pay_period_end": "2025-10-10",
    "pay_date": "2025-10-10",
    "employee_count": 45,
    "total_gross_pay": 112500.00,
    "total_net_pay": 112500.00,
    "total_vacation_accrued": 4500.00
  }
]
```

## Pay Period Helpers

### GET /api/payroll-v2/next-pay-period

Get the next pay period dates based on bi-weekly schedule.

**Response:**
```json
{
  "period_start": "2025-10-11",
  "period_end": "2025-10-24",
  "pay_date": "2025-10-24"
}
```

### GET /api/payroll-v2/current-pay-period

Get the current pay period dates.

## Vacation Management

### GET /api/payroll-v2/vacation/balances

Get vacation balances for all employees.

**Response:**
```json
[
  {
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "hourly_rate": 25.00,
    "vacation_hours_earned": 120.50,
    "vacation_hours_paid": 40.00,
    "vacation_hours_balance": 80.50,
    "vacation_pay_earned": 3012.50,
    "vacation_pay_paid": 1000.00,
    "vacation_pay_balance": 2012.50
  }
]
```

### POST /api/payroll-v2/vacation/payout

Process a vacation payout for an employee.

**Request:**
```json
{
  "employee_id": 123,
  "vacation_hours_paid": 40.0,
  "payout_date": "2025-10-10",
  "notes": "Vacation payout request",
  "approved_by": 1
}
```

**Validation:**
- Checks if employee has sufficient vacation balance
- Calculates payout at current hourly rate
- Automatically deducts from balance

**Response:**
```json
{
  "id": 456,
  "employee_id": 123,
  "vacation_hours_paid": 40.0,
  "vacation_pay_amount": 1000.00,
  "payout_date": "2025-10-10"
}
```

**Errors:**
- `404`: Employee vacation balance not found
- `400`: Insufficient vacation balance

## Calculation Logic

### Regular Pay
```
regular_pay = regular_hours × hourly_rate
```

### Overtime Pay
```
overtime_pay = overtime_hours × hourly_rate × 1.5
```

### Gross Pay
```
gross_pay = regular_pay + overtime_pay
```

### Vacation Accrual (4%)
```
vacation_hours_accrued = (regular_hours + overtime_hours) × 0.04
vacation_pay_accrued = gross_pay × 0.04
```

### Net Pay
```
net_pay = gross_pay - deductions
```

## Database Tables

- `payrolls` - Payroll records per employee/period
- `employee_vacation_balance` - Running vacation balance
- `vacation_payouts` - Payout history
- `payroll_summary` (view) - Payroll with employee info

## Database Views/Functions

- `payroll_summary` - View joining payrolls with employee data
- `employee_vacation_summary` - View with vacation balance + employee info
- `get_next_pay_period()` - Function returning next period dates
- `get_current_pay_period()` - Function returning current period dates

## Triggers

- `update_vacation_balance_from_payroll()` - Updates vacation balance when payroll is approved
- `update_vacation_balance_from_payout()` - Deducts from balance on payout

## Examples

```bash
# Get all payrolls for a period
curl -X GET "http://localhost:8080/api/payroll-v2?pay_period_start=2025-09-27&pay_period_end=2025-10-10" \
  -H "Cookie: session_id=..."

# Get vacation balances
curl -X GET http://localhost:8080/api/payroll-v2/vacation/balances \
  -H "Cookie: session_id=..."

# Process vacation payout
curl -X POST http://localhost:8080/api/payroll-v2/vacation/payout \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "employee_id": 123,
    "vacation_hours_paid": 40,
    "payout_date": "2025-10-10"
  }'
```

---

*Last verified: January 2026*
