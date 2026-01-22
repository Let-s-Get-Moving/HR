# Revenue Source Comparison API

## Overview
Compares revenue totals between two data sources for the same period:
- **Booked Opportunities** (invoiced amounts by service date)
- **Sales Performance** (booked totals by period)

This helps identify if USD→CAD conversion was applied correctly and if both data sources are aligned.

## Endpoint

```
GET /api/revenue-comparison?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
```

**Authentication:** Requires Manager or Admin role

## Example Request

```bash
curl -X GET \
  'http://localhost:5001/api/revenue-comparison?period_start=2024-12-29&period_end=2025-01-11' \
  -H 'Cookie: connect.sid=YOUR_SESSION_COOKIE'
```

Or via your browser (while logged in):
```
http://localhost:5001/api/revenue-comparison?period_start=2024-12-29&period_end=2025-01-11
```

## Response Format

```json
{
  "period": {
    "start": "2024-12-29",
    "end": "2025-01-11"
  },
  "totals": {
    "booked_opportunities": 670697.34,
    "booked_opportunities_us": 125000.00,
    "booked_opportunities_ca": 545697.34,
    "sales_performance": 670697.34,
    "difference": 0.00,
    "percent_difference": 0.00
  },
  "counts": {
    "booked_opp_people": 15,
    "sales_perf_people": 15,
    "discrepancies": 0
  },
  "status": "match",
  "by_person": [
    {
      "name": "John Smith",
      "booked_opportunities_total": 50000.00,
      "sales_performance_total": 50000.00,
      "difference": 0.00,
      "status": "match",
      "quote_count": 25,
      "booked_count": 25
    }
  ],
  "recommendations": []
}
```

## Status Values

- **`match`** - Totals are the same (within $0.01)
- **`minor_difference`** - Small difference (≤ $100)
- **`significant_difference`** - Large difference (> $100) - investigation needed

## Per-Person Status

- **`match`** - Person's totals match (within $0.01)
- **`minor`** - Small difference (≤ $100)  
- **`significant`** - Large difference (> $100)

## What to Check If Totals Don't Match

1. **USD→CAD Conversion**: Check if `booked_opportunities_us` > 0. If yes, verify those amounts were multiplied by 1.25
2. **Date Ranges**: Booked Opportunities uses `service_date`, Sales Performance uses `period_start`/`period_end`
3. **Name Matching**: Different spellings/formats between the two sources
4. **Data Completeness**: One source may have more/fewer records

## Testing for Dec 29 - Jan 11 Period

```bash
# Check if revenue sources match for the period
curl 'http://localhost:5001/api/revenue-comparison?period_start=2024-12-29&period_end=2025-01-11'
```

If `difference` is large and `booked_opportunities_us` > 0, it likely means:
- US branch invoiced amounts were NOT converted from USD→CAD yet
- You need to re-import the Booked Opportunities file after the conversion fix
