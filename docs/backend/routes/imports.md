# Imports API

> **Source**: `api/src/routes/imports.js`

File import endpoints for various data types.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/imports/commissions | Import commission data | Required |
| POST | /api/imports/booked-opportunities | Import booked opportunities | Required |
| POST | /api/imports/lead-status | Import lead status adjustments | Required |
| POST | /api/imports/sales-performance | Import sales performance data | Required |

## POST /api/imports/commissions

Import commission data from Excel file.

**Request:** multipart/form-data
- `file` - Excel file with commission data

**Response:**
```json
{
  "message": "Import completed",
  "summary": {
    "rows_processed": 150,
    "rows_imported": 148,
    "rows_skipped": 2,
    "employees_matched": 45,
    "employees_not_found": 2
  }
}
```

## POST /api/imports/booked-opportunities

Import booked opportunities data.

**Request:** multipart/form-data
- `file` - Excel file with opportunities data

**Response:**
```json
{
  "message": "Import completed",
  "summary": {
    "opportunities_imported": 85,
    "total_revenue": 125000.00
  }
}
```

## POST /api/imports/lead-status

Import lead status adjustments.

**Request:** multipart/form-data
- `file` - Excel file with lead status data

**Response:**
```json
{
  "message": "Import completed",
  "summary": {
    "adjustments_imported": 45
  }
}
```

## POST /api/imports/sales-performance

Import sales performance data.

**Request:** multipart/form-data
- `file` - Excel file with performance data

**Response:**
```json
{
  "message": "Import completed",
  "summary": {
    "records_imported": 60
  }
}
```

## Rate Limiting

Import endpoints have special rate limiting:
- 10 uploads per 15 minutes

## Related Utilities

- `api/src/utils/commissionImporter.js`
- `api/src/utils/bookedOpportunitiesImporter.js`
- `api/src/utils/leadStatusImporter.js`
- `api/src/utils/salesPerformanceImporter.js`

## Examples

```bash
# Import commissions
curl -X POST http://localhost:8080/api/imports/commissions \
  -H "Cookie: session_id=..." \
  -F "file=@commissions.xlsx"
```

---

*Last verified: January 2026*
