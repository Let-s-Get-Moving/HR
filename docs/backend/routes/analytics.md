# Analytics API

> **Source**: `api/src/routes/analytics.js`

Dashboard analytics and workforce metrics.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/analytics/dashboard | Dashboard metrics | Required |
| GET | /api/analytics/workforce | Workforce statistics | Required |
| GET | /api/analytics/payroll-summary | Payroll summary | Required |
| GET | /api/analytics/leave-summary | Leave summary | Required |
| GET | /api/analytics/compliance-summary | Compliance summary | Required |

## GET /api/analytics/dashboard

Get main dashboard metrics.

**Response:**
```json
{
  "employee_count": 248,
  "active_employees": 240,
  "terminated_this_month": 2,
  "hired_this_month": 5,
  "pending_leave_requests": 8,
  "active_compliance_alerts": 4,
  "total_hours_this_period": 3840,
  "total_overtime_this_period": 120
}
```

## GET /api/analytics/workforce

Get workforce breakdown.

**Response:**
```json
{
  "by_department": [
    { "department": "Operations", "count": 120 },
    { "department": "Sales", "count": 45 }
  ],
  "by_location": [
    { "location": "Toronto", "count": 150 },
    { "location": "Vancouver", "count": 98 }
  ],
  "by_employment_type": [
    { "type": "Full-time", "count": 200 },
    { "type": "Part-time", "count": 48 }
  ],
  "by_status": [
    { "status": "Active", "count": 240 },
    { "status": "On Leave", "count": 8 }
  ]
}
```

## GET /api/analytics/payroll-summary

Get payroll summary for a period.

**Query Parameters:**
- `start_date` - Period start
- `end_date` - Period end

**Response:**
```json
{
  "total_gross_pay": 580000.00,
  "total_net_pay": 480000.00,
  "total_deductions": 100000.00,
  "total_vacation_accrued": 23200.00,
  "employee_count": 240,
  "average_pay": 2000.00
}
```

## GET /api/analytics/leave-summary

Get leave usage summary.

**Response:**
```json
{
  "pending_requests": 8,
  "approved_this_month": 25,
  "rejected_this_month": 2,
  "total_days_used": 150,
  "by_type": [
    { "type": "Vacation", "days": 100 },
    { "type": "Sick Leave", "days": 35 },
    { "type": "Personal", "days": 15 }
  ]
}
```

## GET /api/analytics/compliance-summary

Get compliance status summary.

**Response:**
```json
{
  "total_alerts": 12,
  "active_alerts": 4,
  "resolved_this_month": 8,
  "by_type": [
    { "type": "SIN_EXPIRY", "count": 3 },
    { "type": "WORK_PERMIT_EXPIRY", "count": 5 },
    { "type": "CONTRACT_EXPIRY", "count": 2 },
    { "type": "TRAINING_EXPIRY", "count": 2 }
  ],
  "expiring_soon": 8
}
```

## Examples

```bash
# Get dashboard
curl -X GET http://localhost:8080/api/analytics/dashboard \
  -H "Cookie: session_id=..."

# Get payroll summary
curl -X GET "http://localhost:8080/api/analytics/payroll-summary?start_date=2025-09-27&end_date=2025-10-10" \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
