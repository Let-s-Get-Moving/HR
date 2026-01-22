# Timecards API

> **Source**: `api/src/routes/timecards.js`

Timecard management with multiple punches per day, overtime detection, and Excel import.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/timecards | List timecards | Required | All (scoped) |
| GET | /api/timecards/:id | Get timecard with entries | Required | All |
| GET | /api/timecards/employee/:id/period | Get employee timecard for period | Required | All |
| GET | /api/timecards/periods/list | List available periods | Required | All (scoped) |
| GET | /api/timecards/stats/summary | Get period statistics | Required | All |
| GET | /api/timecards/day-view/:date | Get entries for specific day | Required | All (scoped) |
| GET | /api/timecards/dates-with-data | Get dates with timecard data | Required | All (scoped) |
| POST | /api/timecards/import | Import from Excel | Required | Manager+ |
| POST | /api/timecards/entries | Create timecard entry | Required | Manager+ |
| PUT | /api/timecards/entries/:id | Update timecard entry | Required | Manager+ |
| DELETE | /api/timecards/entries/:id | Delete timecard entry | Required | Manager+ |

## RBAC Scope

- **Admin/Manager**: See all timecards
- **User**: See only their own timecards

## GET /api/timecards

List timecards with optional filters.

**Query Parameters:**
- `employee_id` - Filter by employee
- `pay_period_start` - Filter by period start
- `pay_period_end` - Filter by period end
- `status` - Filter by status (Draft, Submitted, Approved, Rejected)

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "employee_name": "John Doe",
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "total_hours": 80.50,
    "overtime_hours": 5.50,
    "status": "Draft"
  }
]
```

## GET /api/timecards/:id

Get a timecard with all clock entries.

**Response:**
```json
{
  "id": 1,
  "employee_id": 123,
  "employee_name": "John Doe",
  "pay_period_start": "2025-09-08",
  "pay_period_end": "2025-09-21",
  "total_hours": 80.50,
  "overtime_hours": 5.50,
  "status": "Draft",
  "entries": [
    {
      "id": 1,
      "work_date": "2025-09-08",
      "clock_in": "08:45:00",
      "clock_out": "14:46:00",
      "hours_worked": 6.02,
      "is_overtime": false,
      "notes": null
    },
    {
      "id": 2,
      "work_date": "2025-09-08",
      "clock_in": "15:16:00",
      "clock_out": "17:07:00",
      "hours_worked": 1.85,
      "is_overtime": false,
      "notes": null
    }
  ]
}
```

## GET /api/timecards/periods/list

List all available pay periods from uploads.

**Response:**
```json
[
  {
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "period_label": "2025-09-08 - 2025-09-21",
    "timecard_count": 45
  }
]
```

## GET /api/timecards/stats/summary

Get statistics for a pay period.

**Query Parameters:**
- `pay_period_start` - Required
- `pay_period_end` - Required

**Response:**
```json
{
  "period": {
    "start": "2025-09-08",
    "end": "2025-09-21"
  },
  "summary": {
    "total_employees": 45,
    "total_hours": 3600.50,
    "total_overtime": 125.50,
    "total_missing_punches": 5,
    "employees_with_overtime": 12
  },
  "employees": [
    {
      "employee_id": 123,
      "employee_name": "John Doe",
      "total_hours": 80.50,
      "overtime_hours": 5.50,
      "missing_punches_count": 0,
      "status": "Draft"
    }
  ]
}
```

## GET /api/timecards/day-view/:date

Get all timecard entries for a specific day.

**Response:**
```json
[
  {
    "employee_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "department": "Operations",
    "entry_id": 456,
    "work_date": "2025-09-08",
    "clock_in": "08:45:00",
    "clock_out": "17:00:00",
    "hours_worked": 8.25,
    "is_overtime": true,
    "timecard_status": "Draft"
  }
]
```

## POST /api/timecards/import

Import timecards from Excel file.

**Request:** multipart/form-data
- `excel_file` - The Excel file
- `sheet_name` - Optional sheet name
- `pay_period_start` - Optional manual override
- `pay_period_end` - Optional manual override

**Response:**
```json
{
  "message": "Timecard import completed successfully",
  "summary": {
    "file": "timecards.xlsx",
    "sheet": "Sheet1",
    "timecards_created": 40,
    "timecards_updated": 5,
    "entries_inserted": 560,
    "entries_skipped": 0,
    "errors": [],
    "warnings": []
  }
}
```

## POST /api/timecards/entries

Create a new timecard entry.

**Request:**
```json
{
  "timecard_id": 1,
  "employee_id": 123,
  "work_date": "2025-09-08",
  "clock_in": "08:00",
  "clock_out": "17:00",
  "notes": "Regular shift"
}
```

## PUT /api/timecards/entries/:id

Update a timecard entry.

**Request:**
```json
{
  "clock_in": "08:30",
  "clock_out": "17:30",
  "notes": "Updated times"
}
```

**Note:** Hours are automatically recalculated.

## Database Tables

- `timecards` - Timecard headers (one per employee/period)
- `timecard_entries` - Individual clock in/out records
- `timecard_uploads` - Upload metadata

## Overtime Logic

- Overtime is flagged when `hours_worked > 8` for a single entry
- Timecard `overtime_hours` sums all overtime across entries
- Database trigger auto-marks `is_overtime` on entries

## Examples

```bash
# List timecards for a period
curl -X GET "http://localhost:8080/api/timecards?pay_period_start=2025-09-08&pay_period_end=2025-09-21" \
  -H "Cookie: session_id=..."

# Get specific timecard
curl -X GET http://localhost:8080/api/timecards/1 \
  -H "Cookie: session_id=..."

# Import Excel file
curl -X POST http://localhost:8080/api/timecards/import \
  -H "Cookie: session_id=..." \
  -F "excel_file=@timecards.xlsx"

# Update an entry
curl -X PUT http://localhost:8080/api/timecards/entries/456 \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"clock_in": "08:30", "clock_out": "17:30"}'
```

---

*Last verified: January 2026*
