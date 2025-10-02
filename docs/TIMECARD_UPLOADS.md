# Timecard Uploads Feature

## Overview

The Timecard Uploads feature allows you to upload Excel timecard files and view them exactly as they appear in the spreadsheet, with comprehensive dashboard statistics.

## Features

### 1. Upload Timecard Excel Files
- Upload Excel files containing employee timecards
- Automatic pay period detection from filename or Excel content
- Support for multiple employees per file
- Replaces existing data if same period is uploaded twice

### 2. View Uploads
- List all uploaded timecard files
- See summary info: filename, pay period, employee count, total hours
- Click any upload to view details

### 3. Employee Timecard View
- Displays timecard exactly as in Excel
- Supports multiple IN/OUT pairs per day
- Shows Day, Date, IN, OUT, Work Time, Daily Total, and Notes
- Highlights missing punches in red
- Preserves empty rows for days off

### 4. Dashboard Statistics
- **Total Hours This Period**: Sum of all hours across all uploads
- **Total Active Employees**: Count of unique employees
- **Average Hours per Employee**: Mean hours worked
- **Top 5 Employees by Hours**: Leaderboard of highest hour employees
- **Latest Upload Date**: When last file was uploaded
- **Missing Punches Count**: Number of incomplete clock-in/out pairs

## Excel File Format

### Expected Structure
```
Employee: John Doe
Pay Period: 2025-09-08-2025-09-21

Day     | Date        | IN        | OUT       | Work Time | Daily Total | Note
MON     | 2025-09-08  | 08:33 AM  | 03:20 PM  | 06:46     | 06:46       |
        |             | 05:00 PM  |           |           |             | Missing OUT
TUE     | 2025-09-09  | 08:00 AM  | 05:00 PM  | 08:00     | 08:00       |
```

### Key Points
- Multiple employees can be in one file
- Multiple clock-in/out pairs per day are supported
- Empty rows for days off are preserved
- "Missing OUT" notes are automatically detected
- Pay period can be in filename or Excel content

### Filename Format
- `"Month Day- Month Day,Year"` (e.g., `"September 08- September 21,2025"`)
- `"Month Day, Year Month Day, Year"` (e.g., `"August 25, 2025 September 7, 2025"`)

## Usage

### Uploading Timecards

1. Navigate to **Time Tracking** → **Timecard Uploads** tab
2. Click **Upload Timecards** button
3. Select your Excel file
4. Click **Upload**
5. System will:
   - Parse the file
   - Match employees by name (must exist in database first)
   - Store timecard data in display format
   - Show success message with employee count and total hours

### Viewing Uploads

1. Go to **Timecard Uploads** tab
2. You'll see a grid of all uploaded files with:
   - Filename
   - Pay period dates
   - Number of employees
   - Total hours
   - Upload date/time
3. Click **View Dashboard** for overall statistics
4. Click any upload card to view details

### Viewing Employee Timecards

1. From upload details, select an employee
2. You'll see their timecard in Excel format with:
   - Day of week (MON, TUE, etc.)
   - Date
   - All clock-in/out pairs for each day
   - Work time for each pair
   - Daily total (shown once per day)
   - Notes (e.g., "Missing OUT")
3. Missing punches are highlighted in red
4. Navigate back to see other employees

## Database Schema

### `timecard_uploads` Table
- `id`: Primary key
- `filename`: Original file name
- `pay_period_start`, `pay_period_end`: Date range
- `upload_date`: When uploaded
- `employee_count`: Number of employees in upload
- `total_hours`: Sum of all hours
- `status`: processing/processed/error

### `timecards` Table (Extended)
- `upload_id`: Links to timecard_uploads
- `row_order`: For displaying multiple entries

### `timecard_entries` Table (Extended)
- `day_of_week`: MON, TUE, WED, etc.
- `daily_total`: Sum of hours for the day
- `row_order`: Order of multiple punches same day
- `is_first_row`: TRUE if first entry of the day

## API Endpoints

### Upload Timecard
```
POST /api/timecard-uploads/upload
Content-Type: multipart/form-data
Body: { file: <Excel file> }
```

### Get All Uploads
```
GET /api/timecard-uploads/uploads
Response: [{ id, filename, pay_period_start, pay_period_end, ... }]
```

### Get Upload Details
```
GET /api/timecard-uploads/uploads/:id
```

### Get Employees for Upload
```
GET /api/timecard-uploads/uploads/:id/employees
```

### Get Employee Timecard Entries
```
GET /api/timecard-uploads/uploads/:uploadId/employees/:employeeId/entries
Response: { timecard: {...}, entries: [...] }
```

### Get Dashboard Stats
```
GET /api/timecard-uploads/stats
Response: {
  summary: { total_hours, total_employees, avg_hours_per_employee },
  topEmployees: [...],
  missingPunches: number,
  latestUpload: {...}
}
```

## Important Notes

1. **Employees Must Exist First**: The system will NOT auto-create employees. Add employees manually through the UI before uploading timecards.

2. **Data Replacement**: Uploading the same pay period twice will replace the old data.

3. **Pay Period Detection**: System tries to detect pay period from:
   - Filename pattern
   - Excel content (looks for "Pay Period" row)
   - Both sources for validation

4. **Multiple Punches Per Day**: Supports multiple clock-in/out pairs per day (e.g., split shifts, lunch breaks).

5. **Missing Punches**: When a clock-in exists but no clock-out, the Note field will show "Missing OUT" and the row is highlighted in red.

## Troubleshooting

### "Employee not found"
- Ensure the employee exists in the database first
- Check that the name in the Excel file matches exactly (case-insensitive)
- Add the employee manually through the Employees page

### "Could not determine pay period"
- Check filename format matches expected patterns
- Ensure "Pay Period" row exists in Excel with format: `2025-09-08-2025-09-21`

### Missing Data
- Verify Excel file has all required columns: Day, Date, IN, OUT, Work Time, Daily Total, Note
- Check that employee names are in "First Last" format

## Migration

To apply the database schema changes, run:
```bash
export DATABASE_URL="your-database-url"
cd api
node -e "import('pg').then(({ default: pg }) => { import('fs').then((fs) => { const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); client.connect().then(() => { const sql = fs.readFileSync('../db/init/035_timecard_uploads_schema.sql', 'utf8'); return client.query(sql); }).then(() => { console.log('✅ Migration successful!'); return client.end(); }).catch(err => { console.error('❌ Error:', err); client.end(); }); }); });"
```

## Future Enhancements

- Export timecard to PDF
- Bulk delete uploads
- Filter uploads by date range
- Edit timecard entries inline
- Approval workflow
- Automated reminders for missing punches

