# Time Tracking Page

> **Source**: `web/src/pages/TimeTracking.jsx`

Timecard viewing, day view, and Excel upload management.

## Overview

The Time Tracking page provides multiple views:
- Day View - See all employees who worked on a specific day
- Uploads List - View uploaded Excel files
- Upload Detail - See employees in a specific upload
- Employee Timecard - Detailed timecard for one employee

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access, can upload and edit |
| Manager | Full access, can upload |
| User | View own timecards only |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/employees | Employee list |
| GET /api/timecards/dates-with-data | Available dates |
| GET /api/timecards/day-view/:date | Day view data |
| GET /api/timecards/periods/list | Pay periods |
| GET /api/timecards | Timecards list |
| GET /api/timecards/:id | Timecard detail |
| GET /api/timecard-uploads | Upload list |
| GET /api/timecard-uploads/:id/data | Upload data |
| POST /api/timecard-uploads/upload | Upload file |
| PUT /api/timecards/entries/:id | Edit entry |

## Views

### Day View (Default)

Shows all clock entries for a selected date.

- Date picker to select day
- Table with all employees who worked
- Shows clock in/out times for each
- Overtime highlighting
- Search by employee name

### Uploads List

List of uploaded Excel files with:
- File name
- Pay period
- Employee count
- Upload date
- Status

### Upload Detail

Selected upload showing:
- Employee list from that upload
- Hours summary per employee
- Click to see individual timecard

### Employee Timecard

Detailed view of one employee's timecard:
- Day-by-day breakdown
- Multiple punches per day
- Daily totals
- Period totals
- Edit capability (admin)

## Components Used

- `UploadsListView` - Uploads table
- `UploadDetailView` - Single upload details
- `EmployeeTimecardView` - Employee timecard
- `DateRangePicker` - Period selection
- `DatePicker` - Day selection

## State

```jsx
const [view, setView] = useState("day-view");
const [timecards, setTimecards] = useState([]);
const [employees, setEmployees] = useState([]);
const [payPeriods, setPayPeriods] = useState([]);
const [selectedPeriod, setSelectedPeriod] = useState(null);
const [selectedDate, setSelectedDate] = useState("");
const [dayViewData, setDayViewData] = useState([]);
const [availableDates, setAvailableDates] = useState([]);
const [uploads, setUploads] = useState([]);
const [selectedUpload, setSelectedUpload] = useState(null);
const [showUploadModal, setShowUploadModal] = useState(false);
```

## Upload Modal

Steps:
1. Click "Upload Timecards" button
2. Select Excel file
3. Optionally specify pay period (auto-detected if not)
4. Upload processes the file
5. Summary shown with results

## Entry Editing

Admin/Manager can edit timecard entries:
1. Click edit on an entry
2. Modify clock in/out times
3. Hours recalculated automatically
4. Save updates database

## RBAC Filtering

- **User role**: Only sees their own timecard data
- **Manager/Admin**: Sees all employees

## Excel Format

Expected Excel structure:
```
Pay Period: 2025-09-08 - 2025-09-21
Employee: John Doe

Date       | IN       | OUT      | Hours
2025-09-08 | 08:45 AM | 05:00 PM | 8.25
```

## Related

- [Timecards API](../../backend/routes/timecards.md)
- [Timecard Uploads API](../../backend/routes/timecard-uploads.md)
- [TimecardUploadViewer Component](../components/timecard-upload-viewer.md)

---

*Last verified: January 2026*
