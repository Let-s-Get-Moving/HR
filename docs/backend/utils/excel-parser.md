# Excel Parser

> **Source**: `api/src/utils/excelParser.js`, `api/src/utils/unifiedFileParser.js`

Utilities for parsing Excel files.

## unifiedFileParser

Main parser for timecard Excel files.

### parseTimecardExcel(buffer, filename)

```javascript
import { parseTimecardExcel } from '../utils/unifiedFileParser.js';

const result = await parseTimecardExcel(fileBuffer, 'timecards.xlsx');
```

**Returns:**
```javascript
{
  payPeriod: {
    start: '2025-09-08',
    end: '2025-09-21'
  },
  employees: [
    {
      name: 'John Doe',
      entries: [
        {
          date: '2025-09-08',
          day: 'MON',
          clockIn: '08:45',
          clockOut: '17:00',
          hours: 8.25
        }
      ],
      totalHours: 80.5
    }
  ]
}
```

### Features

- Auto-detects pay period from headers or filename
- Handles multiple employees per file
- Parses 12-hour (AM/PM) and 24-hour time formats
- Supports multiple punches per day
- Extracts notes (e.g., "Missing OUT")

## excelParser

Lower-level Excel parsing utilities.

### readExcel(buffer, sheetName?)

Read Excel file to array of arrays:

```javascript
import { readExcel } from '../utils/excelParser.js';

const data = readExcel(fileBuffer, 'Sheet1');
// data: [['A1', 'B1'], ['A2', 'B2'], ...]
```

### parseTimeValue(value)

Parse time string to normalized format:

```javascript
parseTimeValue('08:45 AM') // '08:45:00'
parseTimeValue('2:30 PM')  // '14:30:00'
parseTimeValue('14:30')    // '14:30:00'
```

### parseHoursValue(value)

Parse hours value (handles various formats):

```javascript
parseHoursValue('8:30')   // 8.5
parseHoursValue('8.5')    // 8.5
parseHoursValue(8.5)      // 8.5
```

## Dependencies

- `xlsx` - Excel file reading

## Related

- [Timecard Uploads API](../routes/timecard-uploads.md)
- [Timecards API](../routes/timecards.md)

---

*Last verified: January 2026*
