# Leave Management - HR Workflow Implementation

## Overview
Transformed the leave management system from employee-facing "request" workflow to HR-focused "record entry" workflow, making it logical and functional for HR staff who are the only users of this system.

## The Problem
Previously, the system had "New Leave Request" which implied employees were submitting requests through the app. This didn't make sense since only HR has access to the system.

## The Solution
Redesigned as **"Record Leave Entry"** - HR records leave that employees have communicated through various channels (email, phone, in-person, etc.).

---

## 🎯 Key Features

### 1. **Record Leave Entry** (formerly "New Leave Request")

#### Form Fields:
- **Employee** (Dropdown)
  - Searchable dropdown with employee names
  - Shows: "First Last - Department"
  - Only shows active employees
  
- **Leave Type** (Dropdown)
  - Vacation, Sick Leave, Personal Leave, Bereavement, Parental Leave, Jury Duty, Military Leave
  
- **Available Balance Display**
  - Automatically shows when employee + leave type selected
  - Shows: Entitled days + Carried over - Used days
  - Real-time calculation

- **Start Date / End Date** (Date Pickers)
  - Required fields
  - Auto-calculates total days

- **Total Days Calculation**
  - Automatically calculates between start and end dates
  - Includes both start and end date
  - Displays prominently in blue box

- **Request Method** (Dropdown) ⭐ NEW
  - 📧 Email
  - 📞 Phone
  - 🤝 In-Person
  - 💬 Slack
  - 📝 Written
  - ❓ Other
  - *Purpose: Track how employee communicated the request*

- **Status** (Dropdown) ⭐ NEW
  - ⏳ Pending Review
  - ✅ Approved
  - ❌ Rejected
  - 🚫 Cancelled
  - *Purpose: Set status immediately when recording*

- **Reason** (Text Area)
  - Optional
  - Employee's reason for taking leave

- **HR Notes (Internal)** (Text Area) ⭐ NEW
  - Optional
  - Internal notes for HR records only
  - Not visible to employee

- **Approved By** (Dropdown) ⭐ NEW
  - Optional
  - Select HR staff who approved it
  - Filters to show only employees with "HR" in role title

#### Action Buttons:
1. **💾 Save as [Status]**
   - Saves leave with selected status
   - Use for recording pending requests

2. **✅ Save & Approve**
   - Saves leave AND sets status to "Approved"
   - Automatically updates leave balances
   - Creates leave calendar entry

---

## 🔄 How The System Works Together

### Workflow:
```
Record Leave Entry
    ↓
Save to Database (leave_requests table)
    ↓
If Status = "Approved"
    ├─→ Update leave_balances (add to used_days)
    ├─→ Create leaves table entry
    └─→ Show in Leave Calendar
    ↓
Display in Analytics
```

### Tab Integration:

#### 📝 **Record Leave** Tab
- Primary HR data entry interface
- Records all leave communications
- Sets initial status

#### 💰 **Leave Balances** Tab
- Automatically updated when leave approved
- Shows: Entitled days, Used days, Carried over days
- Per employee, per leave type, per year

#### 📅 **Leave Calendar** Tab
- Shows all APPROVED leaves visually
- Color-coded by leave type
- Monthly calendar view

#### 📊 **Analytics** Tab
- Total requests by status
- Leave balance summaries
- Upcoming leaves (next 30 days)

---

## 💾 Database Changes

### New Column: `request_method`
```sql
ALTER TABLE leave_requests 
ADD COLUMN request_method TEXT 
CHECK (request_method IN ('Email', 'Phone', 'In-Person', 'Slack', 'Written', 'Other'));
```

### Existing Columns Enhanced:
- `status` - Now settable on creation (not just Pending)
- `approved_by` - Now tracked from creation
- `notes` - Now used for internal HR notes
- `approved_at` - Auto-set when status = Approved

### Auto-Maintained Tables:

#### `leave_balances` Table
- **Auto-increments `used_days`** when leave approved
- **Auto-decrements `used_days`** when approved leave is rejected/cancelled
- **Creates entry** if doesn't exist (sets entitled_days from leave_type defaults)
- **Per year** - tracks by calendar year

#### `leaves` Table
- **Auto-creates entry** when leave approved
- **Auto-deletes entry** when approved leave is cancelled
- Used for historical records and ESA compliance

---

## 🔧 Backend API Changes

### POST `/api/leave/requests`
**Enhanced to accept:**
```javascript
{
  employee_id: number,           // Required
  leave_type_id: number,         // Required
  start_date: string,            // Required (YYYY-MM-DD)
  end_date: string,              // Required (YYYY-MM-DD)
  total_days: number,            // Auto-calculated
  reason: string,                // Optional
  notes: string,                 // Optional (HR internal)
  status: string,                // Default: 'Pending'
  request_method: string,        // NEW: How it was requested
  approved_by: number            // NEW: HR user ID (optional)
}
```

**Automatic Actions:**
- If `status = 'Approved'`:
  - Updates `leave_balances` (increment used_days)
  - Creates `leaves` table entry
  - Sets `approved_at` timestamp
- Uses transactions (BEGIN/COMMIT/ROLLBACK) for safety

### PUT `/api/leave/requests/:id/status`
**Enhanced to handle:**
- Approving previously pending requests
- Cancelling previously approved requests
- Auto-adjusts leave_balances accordingly
- Transaction-safe

---

## 📊 Benefits

### For HR Staff:
1. ✅ **Accurate Records** - Track HOW leave was requested
2. ✅ **Immediate Approval** - Can approve while recording
3. ✅ **Internal Notes** - Keep HR-only notes separate from employee reason
4. ✅ **Balance Tracking** - See available days before approving
5. ✅ **No Confusion** - Clear that HR is recording, not employees requesting
6. ✅ **Audit Trail** - Track who approved and when

### System Benefits:
1. ✅ **Data Integrity** - Transactions prevent partial updates
2. ✅ **Automatic Calculations** - Total days calculated automatically
3. ✅ **Integrated System** - All tabs work together seamlessly
4. ✅ **Balance Management** - Leave balances auto-maintained
5. ✅ **Calendar Sync** - Approved leaves show in calendar immediately

---

## 🚀 Usage Example

### Scenario: Employee calls HR to request vacation

1. **HR opens "Record Leave" tab**
2. **Selects employee** from dropdown
3. **Selects "Vacation"** as leave type
4. **Sees available balance**: "15.5 days available"
5. **Enters dates**: Aug 15 - Aug 19
6. **System calculates**: "5 days"
7. **Selects request method**: "📞 Phone"
8. **Selects status**: "✅ Approved" (or Pending if needs review)
9. **Adds reason**: "Family vacation"
10. **Adds HR note**: "Confirmed no conflicts with team calendar"
11. **Clicks "Save & Approve"**

### Result:
- ✅ Leave request created
- ✅ Leave balance updated (15.5 → 10.5 available)
- ✅ Calendar shows Aug 15-19 as vacation
- ✅ Analytics updated
- ✅ Complete audit trail

---

## 🎨 UI/UX Improvements

### Visual Design:
- Clean, modern dark theme
- Color-coded status indicators
- Icons for visual clarity
- Responsive grid layout

### User Experience:
- Real-time calculations
- Contextual help text
- Clear field labels
- Two-button workflow (save vs approve)
- Balance warnings (when implementing phase 2)

### Accessibility:
- Required field indicators (*)
- Clear form structure
- Logical tab order
- Dropdown for better data entry

---

## 📝 Future Enhancements (Phase 2)

1. **Conflict Detection**
   - Warn if too many people off same dates
   - Check team coverage

2. **Email Notifications**
   - Auto-email employee when leave approved
   - Template system for communications

3. **Document Attachments**
   - Upload doctor's notes for sick leave
   - Store vacation request emails

4. **Bulk Operations**
   - Approve multiple requests at once
   - Import leave from CSV

5. **Advanced Analytics**
   - Leave patterns by department
   - Predictive analytics for busy periods
   - ESA compliance reports

6. **Mobile Responsive**
   - Optimize for tablet use
   - Quick approve interface

---

## 🔍 Testing Checklist

- [x] Employee dropdown loads all active employees
- [x] Leave balance displays correctly
- [x] Total days calculation accurate
- [x] Status dropdown works
- [x] Request method saves correctly
- [x] "Save & Approve" immediately approves
- [x] Leave balances auto-update on approval
- [x] Calendar shows approved leaves
- [x] Analytics reflects new data
- [x] Form resets after submission
- [x] No linter errors
- [x] Backend transactions work correctly

---

## 📚 Related Documentation

- [Employee Profile Editing](./EMPLOYEE_PROFILE_EDITING.md)
- [System Overview](./SYSTEM_OVERVIEW.md)
- [Database Schema](../db/init/003_leave_management.sql)

---

## 💡 Design Philosophy

> "The system should reflect the actual workflow, not force a workflow to fit the system."

This implementation puts HR at the center, recognizing that they are the gatekeepers of leave management. By focusing on **recording** rather than **requesting**, we've created a system that matches real-world HR operations.

