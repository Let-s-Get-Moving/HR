# Leave Management Page

> **Source**: `web/src/pages/LeaveManagement.jsx`

Leave request submission, approval workflow, balances, and calendar.

## Overview

The Leave Management page provides:
- My Leave Requests - View/submit own requests
- Leave Balances - View employee leave balances
- Leave Calendar - Visual calendar of approved leave
- Pending Approvals - Approve/reject requests (managers)
- Leave Policies - Configure leave types (admin)

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access, can configure policies |
| Manager | Can view all, approve/reject requests |
| User | Submit requests, view own data only |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/leave-requests | List leave requests |
| POST /api/leave-requests | Submit new request |
| GET /api/leave-requests/pending | Pending requests (managers) |
| PUT /api/leave-requests/:id/status | Approve/reject |
| GET /api/leave/balances | Leave balances |
| GET /api/leave/calendar | Calendar data |
| GET /api/leave/types | Leave types |

## Tabs

### My Requests (User view)

- List of user's own leave requests
- Request status (Pending, Approved, Rejected)
- Submit new request button
- Filter by status

### Submit Request

Form fields:
- Leave Type (dropdown)
- Start Date
- End Date
- Reason (optional)

Validation:
- End date >= Start date
- No overlapping pending requests
- Balance check (warning if insufficient)

### Leave Balances

Table showing:
- Employee name
- Vacation balance
- Sick leave balance
- Personal leave balance
- Year

### Leave Calendar

Visual calendar showing:
- Approved leave periods
- Color-coded by leave type
- Click for details

### Pending Approvals (Manager+)

List of pending requests:
- Employee name
- Leave type
- Dates
- Current balances
- Approve/Reject buttons

### Leave Policies (Admin)

Configure leave types:
- Name
- Default days
- Is paid
- Carry-over rules

## Components Used

- `LeaveRequestForm` - Submit request form
- `LeaveRequestApproval` - Approve/reject interface
- `MyLeaveRequests` - User's requests list
- `LeaveConfigModal` - Policy configuration
- `ManualLeaveCreateModal` - Admin create for others
- `DateRangePicker` - Date selection

## State

```jsx
const [activeTab, setActiveTab] = useState("requests");
const [requests, setRequests] = useState([]);
const [pendingRequests, setPendingRequests] = useState([]);
const [balances, setBalances] = useState([]);
const [calendarData, setCalendarData] = useState([]);
const [leaveTypes, setLeaveTypes] = useState([]);
const [showRequestForm, setShowRequestForm] = useState(false);
```

## Request Workflow

```
User submits request
        │
        ▼
Status: Pending
        │
        ▼
Manager/Admin reviews
        │
        ├──> Approve → Status: Approved
        │              Calendar updated
        │              Balance deducted
        │              Notification sent
        │
        └──> Reject → Status: Rejected
                      Notification sent
```

## Notifications

When request status changes:
- Employee receives notification
- Appears in NotificationCenter
- Can navigate to request details

## Related

- [Leave Requests API](../../backend/routes/leave-requests.md)
- [Leave API](../../backend/routes/leave.md)

---

*Last verified: January 2026*
