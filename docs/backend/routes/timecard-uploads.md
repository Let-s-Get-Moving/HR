# Timecard Uploads API

> **Source**: `api/src/routes/timecardUploads.js`

Excel timecard file upload and processing.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/timecard-uploads/upload | Upload and process Excel file | Required |
| GET | /api/timecard-uploads | List uploads | Required |
| GET | /api/timecard-uploads/:id | Get upload details | Required |
| GET | /api/timecard-uploads/:id/data | Get upload data | Required |
| DELETE | /api/timecard-uploads/:id | Delete upload | Required |

## POST /api/timecard-uploads/upload

Upload and process an Excel timecard file.

**Request:** multipart/form-data
- `file` - The Excel file (.xlsx, .xls)

**Response:**
```json
{
  "message": "Upload successful",
  "upload_id": 123,
  "summary": {
    "file_name": "timecards_sept.xlsx",
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "employee_count": 45,
    "total_entries": 630,
    "employees_created": 2,
    "employees_matched": 43,
    "warnings": []
  }
}
```

## GET /api/timecard-uploads

List all uploads.

**Response:**
```json
[
  {
    "id": 123,
    "file_name": "timecards_sept.xlsx",
    "pay_period_start": "2025-09-08",
    "pay_period_end": "2025-09-21",
    "employee_count": 45,
    "status": "processed",
    "uploaded_at": "2025-09-22T10:00:00Z",
    "uploaded_by": 1
  }
]
```

## GET /api/timecard-uploads/:id/data

Get parsed data from an upload (for viewing in Excel-like format).

**Response:**
```json
{
  "upload_id": 123,
  "pay_period": {
    "start": "2025-09-08",
    "end": "2025-09-21"
  },
  "employees": [
    {
      "name": "John Doe",
      "employee_id": 456,
      "total_hours": 80.5,
      "overtime_hours": 5.5,
      "entries": [
        {
          "date": "2025-09-08",
          "day": "MON",
          "clock_in": "08:45",
          "clock_out": "17:00",
          "hours": 8.25
        }
      ]
    }
  ]
}
```

## Excel Format

The parser expects Excel files in the following format:

```
Pay Period: 2025-09-08 - 2025-09-21
Employee: John Doe

Date       | Day | IN       | OUT      | Work Time | Daily Total | Note
2025-09-08 | MON | 08:45 AM | 02:46 PM | 06:01     | 07:51       |
2025-09-08 | MON | 03:16 PM | 05:07 PM | 01:50     |             |
2025-09-09 | TUE | 08:41 AM | 03:06 PM | 06:24     | 08:00       |

Total Hours: 71.5
```

### Parser Features

- Auto-detects pay period from header or filename
- Supports multiple employees per file
- Handles multiple punches per day
- Parses 12-hour (AM/PM) and 24-hour time formats
- Matches employees by name (fuzzy matching)
- Creates new employees if not found

## Processing Flow

```
1. Upload received
2. Excel parsed with unifiedFileParser
3. Pay period extracted
4. For each employee section:
   a. Match employee by name
   b. Create employee if not found
   c. Create/update timecard record
   d. Insert timecard entries
5. Calculate totals
6. Return summary
```

## Database Tables

- `timecard_uploads` - Upload metadata
- `timecards` - Created from uploads
- `timecard_entries` - Individual punch records
- `employees` - New employees created

## Related

- [Timecards API](./timecards.md) - View and manage timecards

## Examples

```bash
# Upload Excel file
curl -X POST http://localhost:8080/api/timecard-uploads/upload \
  -H "Cookie: session_id=..." \
  -F "file=@timecards.xlsx"

# List uploads
curl -X GET http://localhost:8080/api/timecard-uploads \
  -H "Cookie: session_id=..."

# Get upload data
curl -X GET http://localhost:8080/api/timecard-uploads/123/data \
  -H "Cookie: session_id=..."
```

---

*Last verified: January 2026*
