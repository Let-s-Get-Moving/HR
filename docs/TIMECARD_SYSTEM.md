> **LEGACY DOCUMENT**
> This document is outdated. See [backend/routes/timecards.md](./backend/routes/timecards.md) and [frontend/pages/time-tracking.md](./frontend/pages/time-tracking.md) for current documentation.

# Timecard System Implementation

## Overview

A comprehensive timecard management system that replaces the old time entry tracking with a modern, Excel-based import system. The system supports multiple clock-in/out pairs per day, overtime detection, missing punch alerts, and role-based access control.

## Features

### 📊 **Three View System**

#### 1. Main Table View
- Displays all employee timecards for a selected pay period
- Shows total hours, overtime hours, and status for each employee
- Supports filtering by pay period and employee search with autocomplete
- Click on any employee to view detailed timecard

#### 2. Individual Employee View
- Detailed day-by-day breakdown of clock-in/out times
- Supports multiple clock-in/out pairs per day
- Shows daily totals and period totals
- Displays notes (e.g., "Missing OUT")
- Highlights overtime hours

#### 3. Dashboard/Summary View
- Summary cards showing:
  - Total employees with timecards
  - Total hours worked across all employees
  - Total overtime hours
  - Missing punch count
- Employee breakdown table with stats
- Overtime alerts
- Missing punch alerts

### 📤 **Excel Import**

#### Supported Format
The system imports timecard data from Excel files with the following structure:

```
Pay Period: 2025-09-08 - 2025-09-21
Employee: John Doe

Date       | Day | IN       | OUT      | Work Time | Daily Total | Note
2025-09-08 | MON | 08:45 AM | 02:46 PM | 06:01     | 07:51       |
2025-09-08 | MON | 03:16 PM | 05:07 PM | 01:50     |             |
2025-09-09 | TUE | 08:41 AM | 03:06 PM | 06:24     | 08:00       |
...

Total Hours: 71.5
```

#### Import Features
- Automatically parses pay period from Excel headers
- Supports multiple employees in one file (repeating sections)
- Handles multiple clock-in/out pairs per day
- Parses various time formats (12-hour with AM/PM, 24-hour)
- Extracts notes for missing punches or other issues
- Matches employees by name (fuzzy matching)
- Manual pay period override option

### 🔐 **Role-Based Access Control**

#### Admin
- View all timecards
- Edit timecard entries
- Upload timecard Excel files
- Approve/reject timecards

#### HR
- View all timecards
- Upload timecard Excel files
- View statistics and reports
- Cannot edit individual entries

#### User
- View only their own timecards
- Cannot upload or edit
- Read-only access

### ⚡ **Overtime Detection**

- Automatically calculates overtime hours
- Highlights days with > 8 hours worked
- Shows total overtime per employee
- Dashboard alerts for employees with overtime

### 🚨 **Missing Punch Alerts**

- Detects missing clock-in or clock-out times
- Displays notes from Excel (e.g., "Missing OUT")
- Dashboard summary of total missing punches
- Per-employee missing punch count

## Database Schema

### `timecards` Table
Main timecard records for each employee per pay period.

```sql
CREATE TABLE timecards (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    total_hours NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    status TEXT CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);
```

### `timecard_entries` Table
Individual clock-in/out records for each work day.

```sql
CREATE TABLE timecard_entries (
    id SERIAL PRIMARY KEY,
    timecard_id INTEGER REFERENCES timecards(id),
    employee_id INTEGER REFERENCES employees(id),
    work_date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    work_time INTERVAL,
    hours_worked NUMERIC(5,2),
    is_overtime BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Automatic Triggers
- **Total Hours Calculation**: Automatically updates `timecard.total_hours` when entries change
- **Overtime Calculation**: Auto-calculates overtime (hours > 8 per day)
- **Updated At**: Auto-updates timestamp on modifications

## API Endpoints

### Timecard Endpoints

#### `GET /api/timecards`
Get all timecards with optional filters.

**Query Parameters:**
- `employee_id` - Filter by employee
- `pay_period_start` - Filter by start date
- `pay_period_end` - Filter by end date
- `status` - Filter by status

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": 123,
    "employee_name": "John Doe",
    "email": "john@example.com",
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "total_hours": 71.5,
    "overtime_hours": 3.5,
    "status": "Draft"
  }
]
```

#### `GET /api/timecards/:id`
Get detailed timecard with all entries.

**Response:**
```json
{
  "id": 1,
  "employee_id": 123,
  "employee_name": "John Doe",
  "total_hours": 71.5,
  "entries": [
    {
      "id": 1,
      "work_date": "2025-09-08",
      "clock_in": "08:45:00",
      "clock_out": "14:46:00",
      "hours_worked": 6.01,
      "notes": null
    },
    {
      "id": 2,
      "work_date": "2025-09-08",
      "clock_in": "15:16:00",
      "clock_out": "17:07:00",
      "hours_worked": 1.85,
      "notes": null
    }
  ]
}
```

#### `GET /api/timecards/employee/:employee_id/period`
Get timecard for specific employee and pay period.

**Query Parameters:**
- `pay_period_start` - Start date (required)
- `pay_period_end` - End date (required)

#### `GET /api/timecards/stats/summary`
Get statistics and summary data.

**Query Parameters:**
- `pay_period_start` - Start date (required)
- `pay_period_end` - End date (required)

**Response:**
```json
{
  "period": {
    "start": "2025-09-08",
    "end": "2025-09-21"
  },
  "summary": {
    "total_employees": 10,
    "total_hours": 715.5,
    "total_overtime": 35.5,
    "total_missing_punches": 3,
    "employees_with_overtime": 5
  },
  "employees": [
    {
      "employee_id": 123,
      "employee_name": "John Doe",
      "total_hours": 71.5,
      "overtime_hours": 3.5,
      "missing_punches_count": 0,
      "status": "Draft"
    }
  ]
}
```

#### `GET /api/timecards/periods/list`
Get all available pay periods.

**Response:**
```json
[
  {
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "period_label": "2025-09-08 - 2025-09-21",
    "timecard_count": 10
  }
]
```

#### `POST /api/timecards/import`
Upload and import timecard Excel file.

**Request:**
- Content-Type: `multipart/form-data`
- File field: `excel_file`
- Optional: `sheet_name`
- Optional: `pay_period_start` (manual override)
- Optional: `pay_period_end` (manual override)

**Response:**
```json
{
  "message": "Timecard import completed successfully",
  "summary": {
    "file": "timecards.xlsx",
    "sheet": "Sheet1",
    "timecards_created": 8,
    "timecards_updated": 2,
    "entries_inserted": 120,
    "entries_skipped": 0,
    "errors": [],
    "warnings": []
  }
}
```

#### `POST /api/timecards/entries` (Admin Only)
Create new timecard entry.

#### `PUT /api/timecards/entries/:id` (Admin Only)
Update timecard entry.

#### `DELETE /api/timecards/entries/:id` (Admin Only)
Delete timecard entry.

## Frontend Components

### Main Component: `TimeTracking.jsx`
- Manages three views (main, individual, dashboard)
- Handles state management and API calls
- Implements role-based access control

### Sub-Components:
- **MainTableView**: Displays all timecards in a table
- **IndividualView**: Shows detailed timecard with daily entries
- **DashboardView**: Statistics and summary cards
- **UploadModal**: Excel file upload interface

### Features:
- Pay period dropdown filter
- Employee search with autocomplete
- Real-time filtering
- Smooth animations with Framer Motion
- Dark mode support
- Responsive design

## Usage

### For Employees
1. Navigate to "Time Tracking" from the main menu
2. Select a pay period from the dropdown
3. View your timecard (only yours will be visible)
4. Click "View Details" to see daily breakdown

### For HR Staff
1. Navigate to "Time Tracking"
2. Select pay period
3. Use search to find specific employees
4. Click "Dashboard" to view statistics
5. Upload new timecards using "Upload Timecards" button

### For Administrators
1. All HR functions plus:
2. Edit individual timecard entries
3. Add/delete entries manually
4. Approve/reject timecards

## Excel Preparation Guide

### Format Requirements:
1. **Pay Period Header**: Row with "Pay Period" and date range
2. **Employee Row**: "Employee" label with employee name
3. **Column Headers**: Date, IN, OUT, Work Time, Daily Total, Note
4. **Data Rows**: One row per clock-in/out pair
5. **Total Row**: "Total Hours" with sum

### Example Structure:
```
Pay Period    2025-09-08-2025-09-21
Employee      John Doe

        Date       IN       OUT      Work Time  Daily Total  Note
MON     2025-09-08 08:45 AM 02:46 PM 06:01      07:51
        2025-09-08 03:16 PM 05:07 PM 01:50

TUE     2025-09-09 08:41 AM 03:06 PM 06:24      08:00

Total Hours                                    71.5
```

### Tips:
- Employee names must match database records
- Dates should be in YYYY-MM-DD format
- Times can be 12-hour (AM/PM) or 24-hour format
- Notes are preserved (e.g., "Missing OUT")
- Multiple clock-in/out pairs per day are supported

## Migration from Old System

The old `time_entries` table is still preserved for historical data. The new timecard system uses separate tables (`timecards` and `timecard_entries`).

### Key Differences:
- Old: Single clock-in/out per day
- New: Multiple clock-in/out pairs per day
- Old: CSV import
- New: Excel import with better parsing
- Old: Simple list view
- New: Three views (table, individual, dashboard)
- Old: No overtime detection
- New: Automatic overtime calculation

## Future Enhancements

Potential improvements:
- [ ] Real-time clock-in/out functionality
- [ ] Mobile app integration
- [ ] Biometric time tracking
- [ ] Geofencing for clock-in/out
- [ ] Timecard approval workflow
- [ ] Export to payroll systems
- [ ] Employee self-service time entry
- [ ] Schedule comparison (planned vs actual)

## Troubleshooting

### Import Issues

**Problem**: Employees not found during import
- **Solution**: Check employee names match database exactly. Use fuzzy matching by ensuring first and last names are present.

**Problem**: Pay period not detected
- **Solution**: Use manual period override in upload modal. Ensure Excel has clear "Pay Period" header.

**Problem**: Times not parsing correctly
- **Solution**: Verify time format (12-hour with AM/PM or 24-hour). Examples: "08:45 AM", "14:30"

### Display Issues

**Problem**: No timecards showing
- **Solution**: Check pay period filter. Ensure data was imported successfully.

**Problem**: Wrong hours calculation
- **Solution**: Check for missing clock-out times. Verify Excel data has correct format.

## Technical Notes

### Performance Considerations
- Database indexes on `employee_id`, `work_date`, and pay period dates
- Efficient queries using JOINs to minimize roundtrips
- Frontend caching of employee and period data
- Lazy loading of individual timecard details

### Security
- Role-based access control at API level
- User data filtering based on email/user ID
- Session validation for all endpoints
- File upload size limits

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate timecards
- Triggers automatically maintain calculated fields
- Transaction support for batch imports

## Support

For issues or questions:
1. Check error logs in browser console
2. Verify database schema is up to date
3. Check API server logs for import errors
4. Review Excel file format matches requirements

---

**Last Updated**: September 30, 2025  
**Version**: 1.0.0

