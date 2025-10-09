# Payroll System V2 - Automated Timecard-Based Payroll

## Overview

The new payroll system automatically calculates employee pay based on approved timecards, eliminating the need for manual CSV imports. This system integrates directly with the existing time tracking module and provides comprehensive vacation pay accrual tracking.

## Key Features

### 🔄 Automated Calculation
- **Automatic payroll generation** from approved timecards
- **Regular pay**: Hours × Hourly Rate
- **Overtime pay**: Overtime Hours × Hourly Rate × 1.5
- **Vacation accrual**: 4% of hours and gross pay (accumulated, not paid immediately)
- **Bi-weekly pay periods**: Configurable schedule (current: every 2 weeks from Sept 26, 2025)

### 🏖️ Vacation Pay Management
- **Automatic accrual**: 4% of all hours worked
- **Balance tracking**: Separate tracking of earned, paid, and balance
- **Flexible payouts**: Admins can pay out vacation anytime
- **Historical records**: Complete audit trail of all vacation payouts

### 📊 Status Workflow
1. **Draft**: Payroll generated, pending review
2. **Approved**: Payroll reviewed and approved (triggers vacation balance update)
3. **Paid**: Payment processed and sent to employees

### 🔐 Security & Accuracy
- One payroll record per employee per pay period (prevents duplicates)
- Only approved timecards are included in calculations
- Database triggers ensure vacation balances stay in sync
- Audit trail for all approvals and changes

---

## Database Schema

### `payrolls` Table
Main payroll records for each employee per pay period.

```sql
CREATE TABLE payrolls (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    
    -- Pay Period
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    
    -- Hours & Rate
    regular_hours NUMERIC(10,2) DEFAULT 0,
    overtime_hours NUMERIC(10,2) DEFAULT 0,
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    
    -- Pay Calculation
    regular_pay NUMERIC(10,2) DEFAULT 0,
    overtime_pay NUMERIC(10,2) DEFAULT 0,
    gross_pay NUMERIC(10,2) DEFAULT 0,
    
    -- Vacation Accrual (4%)
    vacation_hours_accrued NUMERIC(10,2) DEFAULT 0,
    vacation_pay_accrued NUMERIC(10,2) DEFAULT 0,
    
    -- Deductions & Net
    deductions NUMERIC(10,2) DEFAULT 0,
    net_pay NUMERIC(10,2) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'Draft',
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);
```

### `employee_vacation_balance` Table
Tracks accumulated vacation pay for each employee.

```sql
CREATE TABLE employee_vacation_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    vacation_hours_earned NUMERIC(10,2) DEFAULT 0,
    vacation_hours_paid NUMERIC(10,2) DEFAULT 0,
    vacation_hours_balance NUMERIC(10,2) DEFAULT 0,
    vacation_pay_earned NUMERIC(10,2) DEFAULT 0,
    vacation_pay_paid NUMERIC(10,2) DEFAULT 0,
    vacation_pay_balance NUMERIC(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);
```

### `vacation_payouts` Table
Records of vacation pay disbursements.

```sql
CREATE TABLE vacation_payouts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    payout_date DATE NOT NULL,
    vacation_hours_paid NUMERIC(10,2) NOT NULL,
    vacation_pay_amount NUMERIC(10,2) NOT NULL,
    hourly_rate_at_payout NUMERIC(10,2) NOT NULL,
    notes TEXT,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Payroll Generation

#### `POST /api/payroll-v2/generate`
Generate payroll for a specific pay period.

**Request Body:**
```json
{
  "pay_period_start": "2025-09-27",
  "pay_period_end": "2025-10-10",
  "pay_date": "2025-10-10",
  "employee_ids": [1, 2, 3] // Optional: specific employees only
}
```

**Response:**
```json
{
  "success": [
    {
      "employee_id": 1,
      "employee_name": "John Doe",
      "payroll_id": 123,
      "gross_pay": 2500.00,
      "net_pay": 2500.00
    }
  ],
  "errors": [],
  "summary": {
    "total_employees": 15,
    "total_regular_hours": 1200,
    "total_overtime_hours": 50,
    "total_gross_pay": 37500.00,
    "total_vacation_accrued": 1500.00
  }
}
```

**Process:**
1. Fetches all active employees
2. For each employee:
   - Gets approved timecards for the period
   - Calculates regular hours and overtime hours
   - Calculates pay: `regular_pay + overtime_pay`
   - Calculates vacation accrual: `4% of hours and pay`
3. Creates payroll records in `Draft` status

---

### Payroll Management

#### `GET /api/payroll-v2/`
Get all payroll records with optional filters.

**Query Parameters:**
- `employee_id` - Filter by employee
- `status` - Filter by status (Draft, Approved, Paid)
- `pay_period_start` - Filter by period start date
- `pay_period_end` - Filter by period end date

**Response:**
```json
[
  {
    "id": 123,
    "employee_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "department": "Operations",
    "pay_period_start": "2025-09-27",
    "pay_period_end": "2025-10-10",
    "pay_date": "2025-10-10",
    "regular_hours": 80,
    "overtime_hours": 5,
    "hourly_rate": 25.00,
    "regular_pay": 2000.00,
    "overtime_pay": 187.50,
    "gross_pay": 2187.50,
    "vacation_hours_accrued": 3.40,
    "vacation_pay_accrued": 87.50,
    "deductions": 0.00,
    "net_pay": 2187.50,
    "status": "Draft"
  }
]
```

#### `GET /api/payroll-v2/:id`
Get a specific payroll record.

#### `POST /api/payroll-v2/:id/approve`
Approve a payroll record (moves from Draft → Approved).

**Request Body:**
```json
{
  "approved_by": 1  // User ID (optional)
}
```

**Effect:** Triggers vacation balance update automatically.

#### `POST /api/payroll-v2/bulk-approve`
Approve multiple payrolls at once.

**Request Body:**
```json
{
  "payroll_ids": [123, 124, 125],
  "approved_by": 1
}
```

#### `POST /api/payroll-v2/:id/mark-paid`
Mark payroll as paid (moves from Approved → Paid).

#### `DELETE /api/payroll-v2/:id`
Delete a payroll record (only if status is Draft).

---

### Vacation Management

#### `GET /api/payroll-v2/vacation/balances`
Get vacation balances for all employees.

**Response:**
```json
[
  {
    "employee_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "hourly_rate": 25.00,
    "vacation_hours_earned": 120.5,
    "vacation_hours_paid": 40.0,
    "vacation_hours_balance": 80.5,
    "vacation_pay_earned": 3012.50,
    "vacation_pay_paid": 1000.00,
    "vacation_pay_balance": 2012.50
  }
]
```

#### `GET /api/payroll-v2/vacation/balance/:employee_id`
Get vacation balance for a specific employee.

#### `POST /api/payroll-v2/vacation/payout`
Process a vacation payout for an employee.

**Request Body:**
```json
{
  "employee_id": 1,
  "vacation_hours_paid": 40.0,
  "payout_date": "2025-10-10",
  "notes": "Vacation payout request",
  "approved_by": 1
}
```

**Validation:**
- Checks if employee has sufficient vacation balance
- Calculates payout amount at current hourly rate
- Automatically deducts from vacation balance

**Response:**
```json
{
  "id": 456,
  "employee_id": 1,
  "vacation_hours_paid": 40.0,
  "vacation_pay_amount": 1000.00,
  "payout_date": "2025-10-10"
}
```

#### `GET /api/payroll-v2/vacation/payouts/:employee_id`
Get vacation payout history for an employee.

---

### Pay Period Helpers

#### `GET /api/payroll-v2/next-pay-period`
Get the next pay period dates.

**Response:**
```json
{
  "period_start": "2025-10-11",
  "period_end": "2025-10-24",
  "pay_date": "2025-10-24"
}
```

#### `GET /api/payroll-v2/current-pay-period`
Get the current pay period dates.

---

## Frontend Interface

### Overview Tab
- **Summary cards**: Next pay date, employee count, vacation balance, pay periods
- **Pay period list**: Shows all historical pay periods with totals
- **Period details**: Click to view detailed breakdown per employee

### Generate Payroll Tab
- **Next period info**: Shows upcoming pay period dates
- **Generate button**: One-click payroll generation
- **How it works**: Explains the calculation process
- **Status**: Real-time generation progress

### Vacation Balances Tab
- **Employee list**: Shows all employees with vacation balances
- **Balance details**: Hours and dollar amounts (earned, paid, balance)
- **Payout button**: Click to process vacation payout
- **Payout dialog**: Enter hours to pay out, validates against balance

### Payment History Tab
- **All payrolls**: Complete list of all payroll records
- **Status indicators**: Visual status badges (Draft, Approved, Paid)
- **Action buttons**: Approve or mark as paid based on status
- **Detailed info**: Hours, rates, vacation accrual, totals

---

## Workflow Guide

### Standard Payroll Process

#### 1. Timecard Collection (During Pay Period)
- Employees/admins upload timecards
- Timecards show hours worked per day
- Status: Draft → Submitted → Approved

#### 2. Payroll Generation (End of Pay Period)
```bash
# Navigate to Payroll → Generate Payroll tab
# Click "Generate Payroll Now"
# System will:
- Fetch all approved timecards
- Calculate pay for each employee
- Create payroll records in Draft status
- Display summary of results
```

#### 3. Payroll Review (Admin)
```bash
# Navigate to Payroll → Payment History tab
# Review all Draft payrolls
# Check hours, rates, calculations
# Click "Approve" on each payroll
# Or use bulk approve (future feature)
```

#### 4. Payment Processing (Admin)
```bash
# After approval, vacation balances update automatically
# Process payments through banking system
# Return to HR system
# Click "Mark Paid" on each payroll
```

#### 5. Vacation Payouts (As Needed)
```bash
# Navigate to Payroll → Vacation Balances tab
# Find employee
# Click "Pay Out"
# Enter hours to pay out
# Click "Process Payout"
# System deducts from balance automatically
```

---

## Calculation Examples

### Example 1: Regular Pay Only
```
Employee: John Doe
Hourly Rate: $25.00
Regular Hours: 80 hours
Overtime Hours: 0 hours

Regular Pay = 80 × $25.00 = $2,000.00
Overtime Pay = 0 × ($25.00 × 1.5) = $0.00
Gross Pay = $2,000.00 + $0.00 = $2,000.00

Vacation Hours Accrued = 80 × 0.04 = 3.20 hours
Vacation Pay Accrued = $2,000.00 × 0.04 = $80.00

Net Pay = $2,000.00 (no deductions)
```

### Example 2: With Overtime
```
Employee: Jane Smith
Hourly Rate: $30.00
Regular Hours: 80 hours
Overtime Hours: 5 hours

Regular Pay = 80 × $30.00 = $2,400.00
Overtime Pay = 5 × ($30.00 × 1.5) = $225.00
Gross Pay = $2,400.00 + $225.00 = $2,625.00

Vacation Hours Accrued = (80 + 5) × 0.04 = 3.40 hours
Vacation Pay Accrued = $2,625.00 × 0.04 = $105.00

Net Pay = $2,625.00 (no deductions)
```

### Example 3: Vacation Payout
```
Employee: John Doe
Vacation Balance: 80.5 hours
Current Hourly Rate: $25.00
Payout Request: 40 hours

Payout Amount = 40 × $25.00 = $1,000.00

New Balance = 80.5 - 40 = 40.5 hours
```

---

## Database Triggers

### Vacation Balance Update (On Payroll Approval)
```sql
-- Automatically updates vacation balance when payroll is approved
CREATE TRIGGER trigger_update_vacation_balance
    AFTER INSERT OR UPDATE OF status ON payrolls
    FOR EACH ROW
    WHEN (NEW.status = 'Approved')
    EXECUTE FUNCTION update_vacation_balance_from_payroll();
```

### Vacation Balance Deduction (On Payout)
```sql
-- Automatically deducts from vacation balance when payout is created
CREATE TRIGGER trigger_update_vacation_balance_payout
    AFTER INSERT ON vacation_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_balance_from_payout();
```

---

## Migration from Old System

### What Changed?
- **Old**: Manual CSV upload of payroll submissions
- **New**: Automatic generation from approved timecards

### Data Migration
- Old `payroll_submissions` table is kept for historical reference
- Old `payroll_calculations` table is kept for historical reference
- New `payrolls` table starts fresh
- No automatic migration of old data (different structure)

### Backwards Compatibility
- Old payroll API endpoints still available at `/api/payroll/*`
- New payroll API endpoints at `/api/payroll-v2/*`
- Old Payroll page available as `Payroll.jsx` (not used)
- New Payroll page at `PayrollV2.jsx` (active)

---

## Configuration

### Pay Period Schedule
The system uses a bi-weekly schedule based on a reference date.

**Current Configuration:**
- Base date: September 26, 2025 (last payout)
- Frequency: Every 2 weeks (14 days)
- Next pay date: October 10, 2025

**To Change:**
Edit `db/init/050_payroll_rework_schema.sql`:
```sql
-- Change base_date in both functions:
CREATE OR REPLACE FUNCTION get_next_pay_period() ...
  base_date DATE := '2025-09-26'::DATE;  -- Change this
  
CREATE OR REPLACE FUNCTION get_current_pay_period() ...
  base_date DATE := '2025-09-26'::DATE;  -- Change this
```

### Vacation Accrual Rate
Currently set to 4% of hours and pay.

**To Change:**
Edit vacation calculation in:
1. Backend: `api/src/routes/payroll-v2.js`
   ```javascript
   const vacationHoursAccrued = totalHours * 0.04;  // Change 0.04
   const vacationPayAccrued = grossPay * 0.04;      // Change 0.04
   ```

2. Documentation: Update all references to "4%" in this file

---

## Troubleshooting

### Issue: Payroll generation returns 0 employees
**Cause:** No approved timecards for the period
**Solution:** 
1. Go to Time Tracking
2. Find timecards for the pay period
3. Approve them
4. Try generating payroll again

### Issue: Vacation balance not updating
**Cause:** Payroll not approved
**Solution:** Vacation balance only updates when payroll status is "Approved"

### Issue: Cannot pay out vacation
**Cause:** Insufficient balance
**Solution:** Check employee's vacation balance before payout

### Issue: Duplicate payroll error
**Cause:** Payroll already exists for that employee/period
**Solution:** Delete draft payroll or edit existing one

---

## Future Enhancements

### Planned Features
- [ ] Bulk approve all payrolls in a period
- [ ] Deductions and tax calculations
- [ ] Export payroll to CSV/Excel
- [ ] Direct deposit file generation
- [ ] Email notifications to employees
- [ ] Payslip PDF generation
- [ ] Year-to-date (YTD) totals
- [ ] T4 slip generation
- [ ] Payroll audit logs
- [ ] Custom pay schedules (weekly, monthly)

---

## Support & Contact

For questions or issues with the payroll system:
1. Check this documentation first
2. Review the API endpoint documentation
3. Check database schema and triggers
4. Contact system administrator

---

**Last Updated:** October 9, 2025  
**Version:** 2.0  
**Author:** HR System Development Team

