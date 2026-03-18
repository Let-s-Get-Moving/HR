# Commission Structure Calculations and Formulas

Documentation of all commission calculations for Sales Agents and Sales Managers.  
Source: `api/src/utils/salesCommissionCalculator.js`, `api/src/utils/commissionAdjustmentsAggregator.js`.

---

## 1. Data Sources

### Revenue Source (v2)

| Source | Field | Notes |
|--------|-------|-------|
| **Booked Opportunities** | `sales_booked_opportunities_quotes.invoiced_amount` | Filtered by `service_date` within commission period |
| **Sales Performance Staging** | `booked_pct` (booking %) | Used for rate tier lookup only; revenue comes from BO |

- US branch amounts are normalized to CAD at import time (×1.25).
- Rows with `booking_pct` only but no BO revenue: `revenue = 0`, still assigned to manager bucket.

### Matching Rules

- Employees: Sales department, `sales_commission_enabled = true`, `sales_role IN ('agent', 'manager', 'international_closer')`.
- `international_closer` is functionally identical to `agent` for commission calculations.
- Matching: any of `nickname`, `nickname_2`, `nickname_3` (normalized) must match staging/BO name.
- Terminated employees are included (commission owed).

---

## 2. Sales Agent Commission

### 2.1 Rate Table (ordered highest-first)

| Condition | Commission % | Vacation Award |
|-----------|---------------|-----------------|
| `booking_pct > 55` AND `revenue > 250000` | 6.0% | $5,000 |
| `booking_pct > 50` AND `revenue > 250000` | 6.0% | $0 |
| `booking_pct > 40` AND `revenue > 200000` | 5.5% | $0 |
| `booking_pct > 35` AND `revenue > 160000` | 5.0% | $0 |
| `booking_pct > 30` AND `revenue > 115000` | 4.5% | $0 |
| (`booking_pct > 30` AND `revenue <= 115000`) OR (`booking_pct <= 30` AND `revenue > 115000`) | 4.0% | $0 |
| else (base) | 3.5% | $0 |

### 2.2 Agent Commission Formula

```
commission_amount = (revenue × commission_pct) / 100
```

Where:
- `revenue` = sum of `invoiced_amount` from Booked Opportunities for that agent in the period.
- `commission_pct` = from rate table above based on `booking_pct` and `revenue`.

### 2.3 Vacation Award

- Only when `booking_pct > 55` AND `revenue > 250000`.
- Fixed value: **$5,000** (configurable via `sales_agent_vacation_package_value` setting).

---

## 3. Sales Manager Commission

### 3.1 Bucket-Sum Method (default)

Manager commission = sum of `(agent_revenue × bucket_rate)` for each agent, where bucket is determined by agent's `booking_pct`.

#### Manager Bucket Rates

| Bucket (booking_pct) | Min | Max | Rate |
|---------------------|-----|-----|------|
| 0–19% | 0 | 19.99 | 0.25% |
| 20–24% | 20 | 24.99 | 0.275% |
| 25–29% | 25 | 29.99 | 0.30% |
| 30–34% | 30 | 34.99 | 0.35% |
| 35–39% | 35 | 39.99 | 0.40% |
| 40%+ | 40 | ∞ | 0.45% |

#### Bucket-Sum Formula

```
pooled_revenue = Σ (revenue of each agent with booking_pct > 0)

For each agent:
  bucket = lookup by agent.booking_pct
  bucket_commission = agent.revenue × bucket.rate / 100

manager_commission = Σ bucket_commission (across all agents)
```

### 3.2 Fixed Override Method

When `employees.sales_manager_fixed_pct` is set (e.g., 0.7 for Sam Lopka):

```
manager_commission = (pooled_revenue × sales_manager_fixed_pct) / 100
```

- `pooled_revenue` = same as bucket-sum (sum of all agent BO revenue in the period).

---

## 4. Commission Adjustments

Adjustments come from Lead Status directives (quote-level) joined with Booked Opportunities.  
Only quotes with `status_norm IN ('completed', 'closed')` and `invoiced_amount IS NOT NULL`.

### 4.1 Directive Types

| Type | Transfer Amount Formula |
|------|--------------------------|
| `percent_split` | `invoiced_amount × pct / 100` |
| `fixed_rev_transfer` | `amount` (fixed) |
| `fixed_booking_transfer` | `amount` (fixed) |

### 4.2 Adjustment Columns

| Column | Meaning | Aggregation |
|--------|---------|-------------|
| `revenue_add_ons` | Amount received from splits/transfers | Sum of `percent_split` + `fixed_rev_transfer` where employee is **target** |
| `revenue_deductions` | Amount deducted for splits/transfers to others | Sum of `percent_split` + `fixed_rev_transfer` where employee is **original** |
| `booking_bonus_plus` | Booking bonus received | Sum of `fixed_booking_transfer` where employee is **target** |
| `booking_bonus_minus` | Booking bonus deducted | Sum of `fixed_booking_transfer` where employee is **original** |

### 4.3 Adjustment Formulas (per quote)

```
percent_split:     transfer_amount = ROUND(invoiced_amount × pct / 100, 2)
fixed_rev_transfer: transfer_amount = amount
fixed_booking_transfer: transfer_amount = amount
```

---

## 5. Final Payout Formula

### Agent Net Commission

```
net_commission = commission_amount 
                 + revenue_add_ons 
                 + booking_bonus_plus 
                 - revenue_deductions 
                 - booking_bonus_minus
```

### Manager Net Commission

Same formula:

```
net_commission = commission_amount 
                 + revenue_add_ons 
                 + booking_bonus_plus 
                 - revenue_deductions 
                 - booking_bonus_minus
```

---

## 6. Rounding

- All monetary values: rounded to 2 decimal places (`Math.round(x * 100) / 100`).
- Transfer amounts in SQL: `ROUND((invoiced_amount * pct / 100)::numeric, 2)`.

---

## 7. Configurable Settings (application_settings)

| Key | Format | Example |
|-----|--------|---------|
| `sales_agent_threshold_1` … `sales_agent_threshold_7` | `leadPct,revenue,commission` | `30,115000,3.5` |
| `sales_agent_vacation_package_value` | number | `5000` |
| `sales_manager_threshold_1` … `sales_manager_threshold_6` | `min,max,commission` | `0,19,0.25` |

**Note:** The Settings UI allows editing these, but the calculator currently uses hardcoded values in `salesCommissionCalculator.js`. Settings are for display/config; code values take precedence.

---

## 8. Employee Overrides

| Field | Applies To | Effect |
|------|------------|--------|
| `sales_manager_fixed_pct` | Manager | Uses fixed % of pooled revenue instead of bucket-sum |
| `sales_commission_enabled` | Agent/Manager | Must be true to participate |
| `sales_role` | Agent/Manager | `agent`, `manager`, or `international_closer` |

---

## 9. Warnings (Data Quality)

- **salesPerfNoBO**: Agents with `booking_pct` in Sales Performance but no BO revenue (revenue = 0).
- **boUnmatchedSalesPerson**: BO rows with `sales_person_raw` that couldn't be matched to any employee.
