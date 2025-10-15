# C&C HR Management System - Complete User Manual

**Version:** 1.0  
**Last Updated:** October 15, 2025  
**Company:** C&C Logistics & Warehouse

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Login & Security](#login--security)
4. [Dashboard](#dashboard)
5. [Employee Management](#employee-management)
6. [Time Tracking](#time-tracking)
7. [Leave Management](#leave-management)
8. [Payroll](#payroll)
9. [Performance Management](#performance-management)
10. [Recruiting](#recruiting)
11. [Compliance](#compliance)
12. [Benefits](#benefits)
13. [Bonuses & Commissions](#bonuses--commissions)
14. [Settings](#settings)
15. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements

- **Browser:** Chrome, Firefox, Safari, or Edge (latest version)
- **Internet:** Stable connection required
- **Screen:** Minimum 1280x720 resolution (responsive on mobile/tablet)

### Accessing the System

**Production URL:** `https://hr-wbzs.onrender.com/`

**Login Credentials:**
- Your username and password will be provided by HR
- New employees receive credentials in format: `FirstnameLastname` / `password123`

---

## User Roles & Permissions

### 🔹 User (Employee)
**What you can do:**
- View your own employee profile
- Track your own time (timecards)
- Submit leave requests
- View your leave calendar
- View your payroll information
- View your bonuses & commissions
- Manage your settings (theme, password, MFA)

**What you CANNOT do:**
- View other employees' data
- Approve leave requests
- Upload timecards/bonuses (Excel)
- Add/edit employees
- Access dashboard analytics

### 🔹 Manager (HR/Admin)
**What you can do:**
- **Everything a User can do, PLUS:**
- View all employees' data
- Add/edit/terminate employees
- Upload timecards (Excel)
- Approve/reject leave requests
- Upload bonuses & commissions (Excel)
- Process payroll
- View dashboard analytics
- Manage recruiting & compliance
- Full system access

---

## Login & Security

### First Time Login

1. Navigate to `https://hr-wbzs.onrender.com/`
2. Enter your username (e.g., `AliSaleh`)
3. Enter your password (default: `password123`)
4. Click **Login**

**⚠️ Important:** Change your password immediately after first login!

### Two-Factor Authentication (MFA)

#### Setting Up MFA

1. Go to **Settings** → **Security** tab
2. Toggle **Two-Factor Authentication** to **ON**
3. Scan QR code with authenticator app:
   - Google Authenticator (iOS/Android)
   - Authy
   - 1Password
   - Microsoft Authenticator
4. Enter the 6-digit code from your app
5. **Save your backup codes!** (shown once)
6. Click **Enable MFA**

#### Logging in with MFA

1. Enter username and password
2. Enter 6-digit code from authenticator app
3. Optional: Check "Trust this device for 7 days" (skip MFA on this device)

#### Trusted Devices

- If you trust a device, you won't need MFA for 7 days
- View trusted devices in **Settings** → **Security** → **Trusted Devices**
- Revoke devices anytime if lost/stolen

### Password Management

#### Password Requirements
- Minimum 8 characters
- Must differ from last 5 passwords
- Expires every 90 days
- Cannot reuse recent passwords

#### Changing Your Password

1. Go to **Settings** → **Security**
2. Click **Change Password**
3. Enter:
   - Current password
   - New password (min 8 chars)
   - Confirm new password
4. Click **Change Password**

#### Password Expiry Warnings

- **30 days before:** Yellow banner reminder
- **7 days before:** Orange banner warning
- **Expired:** Account locked, contact HR

### Session Timeout

- Sessions expire after **30 minutes** of inactivity
- You'll be logged out automatically for security
- Save your work frequently!

---

## Dashboard

**Access:** Main page after login (Manager role only)

### Overview Metrics

**Top Cards (4 metrics):**
1. **Total Active Employees** - Current workforce count
2. **New Hires** - Employees hired this period
3. **Turnover Rate** - Employee departures %
4. **Avg Hours Worked** - Per week

### Time Range Filter

Change the time period for all metrics:
- **This Week** - 7 days
- **This Month** - 30 days (default)
- **This Quarter** - 90 days
- **This Year** - 365 days

### Analytics Cards

**Payroll Overview:**
- Total payroll amount
- Average per employee
- Current time period

**Attendance Metrics:**
- Average hours per week
- Employees tracked
- Time period

**Compliance Status:**
- Contracts signed %
- Active employees
- Training enrolled %

### Charts & Visualizations

**Employment Mix (Donut Chart):**
- Full-time employees
- Part-time employees
- Contract workers

**Department Distribution:**
- Employee count per department
- Percentage breakdown
- Visual bar charts

### Recent Activity

Shows last 10 activities:
- New employee hires
- Payroll processed
- Date formatted as "Oct 15, 2025"

### Quick Actions

**4 Quick Links:**
1. **⏰ Upload Timecards** → Time Tracking page
2. **⭐ Upload Bonuses** → Bonuses & Commissions page
3. **🏖️ Leave & Requests** → Leave Management page
4. **💰 Payroll** → Payroll page

### Refresh Button

Click **Refresh** to reload all dashboard data instantly.

---

## Employee Management

**Access:** Sidebar → **Employees**

### Viewing Employees

**Manager View:**
- See all employees in the system
- Search by name, email, department
- Filter by status (Active/Terminated)
- Filter by employment type

**User View:**
- See only your own profile
- No search/filter options

### Employee List

**Columns:**
- Name
- Email
- Department
- Employment Type (Full-time/Part-time/Contract)
- Hire Date
- Status (Active/Terminated)
- Actions (View/Edit)

### Adding a New Employee

**Manager Only**

#### Step 1: Basic Information
- First Name *
- Last Name *
- Work Email (company email) *
- Personal Email (optional)
- Phone Number
- Gender
- Birth Date

#### Step 2: Employment Details
- Hire Date * (auto-calculates probation end)
- Employment Type * (Full-time/Part-time/Contract)
- Department (optional - assign later)
- **System Access Role** * 
  - **User** (Employee Access) - Can only view own data
  - **Manager** (HR Access) - Full access to all employees
- Hourly Rate ($25 default)
- Probation End Date (auto-filled: hire date + 3 months)

#### Step 3: Personal Details & Banking
- Full Address
- SIN Number
- SIN Expiry Date
- Bank Name
- Bank Account Number
- Bank Transit Number
- Emergency Contact Name
- Emergency Contact Phone

#### Step 4: Review & Submit
- Review all entered information
- Click **Create Employee**

**After Submission:**
- Employee record created
- User account auto-generated
- **Alert shows:**
  ```
  Employee John Smith created successfully!
  
  Login Credentials:
  Username: JohnSmith
  Password: password123
  
  Role: user
  ```
- **⚠️ Write down credentials - shown only once!**

### Viewing Employee Profile

Click **View** on any employee to see:

**Tabs:**

1. **Overview**
   - Full name, email, phone
   - Department, employment type
   - Hire date, status
   - Probation end date

2. **HR Details**
   - SIN number, SIN expiry
   - Bank name, account, transit
   - Full address
   - Emergency contact

3. **Documents** (Future feature)

4. **Activity** (Future feature)

### Editing Employee Information

**Manager Only**

1. Click **Edit** (top right of profile)
2. Modify any field:
   - Basic info (name, email, phone)
   - Employment details (department, type, rate)
   - HR details (SIN, bank, address, emergency contact)
3. Click **Save**

**✅ All changes save to database immediately**

### Terminating an Employee

**Manager Only**

1. Open employee profile
2. Click **Terminate** button
3. Confirm termination
4. Status changes to "Terminated"
5. User account disabled (cannot login)

**Note:** Terminated employees remain in system for records, but cannot access the application.

---

## Time Tracking

**Access:** Sidebar → **Time Tracking**

### Manager View

#### Upload Timecards Tab

**Upload Excel File:**

1. Click **Upload Timecards** button
2. Select Excel file (.xlsx, .xls)
3. **Required columns:**
   - Employee Name
   - Date (YYYY-MM-DD)
   - Hours Worked
   - Job Type (optional)
   - Notes (optional)

4. Click **Upload**
5. System processes and imports timecards
6. Success message shows number of records imported

**View Uploads:**
- See all uploaded timecard files
- Date uploaded
- Number of employees
- Number of entries
- View/edit individual entries

#### Timecard Entries Tab

**View all timecards:**
- Employee name
- Work date
- Hours worked
- Job type
- Notes
- Status

**Search & Filter:**
- Search by employee name
- Filter by date range
- Filter by status

**Export:**
- Export to Excel
- Filtered results only

### User View

**View Your Timecards:**
- See only your own time entries
- Cannot upload timecards
- View hours worked by date
- Total hours per week/month

**No Upload Access:**
- "Upload Timecards" button hidden
- Upload tab not visible
- Search bar hidden

---

## Leave Management

**Access:** Sidebar → **Leave Management**

### Default View: Leave Calendar

Shows approved leave for:
- **User:** Your own approved leaves only
- **Manager:** All employees' approved leaves

**Calendar Features:**
- Color-coded by leave type
- Hover to see details
- Click to view full information

### Leave Types (7 types)

1. **Vacation** - Paid time off
2. **Sick Leave** - Illness/medical
3. **Personal Leave** - Personal matters
4. **Bereavement** - Family loss
5. **Parental Leave** - New parent
6. **Jury Duty** - Legal obligation
7. **Military Leave** - Military service

### Submitting a Leave Request (User)

1. Go to **Leave Management**
2. Click **Submit Leave Request** (or navigate to "Submit Request" tab)
3. Fill out form:
   - **Leave Type** * (dropdown)
   - **Start Date** * (calendar picker)
   - **End Date** * (calendar picker)
   - **Reason** * (text field)
4. Click **Submit Request**

**After Submission:**
- Request sent to HR for approval
- Status: **Pending**
- You'll see it in "My Requests" tab

### Viewing Your Requests (User)

**My Requests Tab:**
- All your leave requests
- Status: Pending, Approved, Rejected
- Dates, leave type, reason
- HR response notes (if rejected)

### Approving Leave Requests (Manager)

1. Go to **Leave Management** → **Pending Requests** tab
2. See all pending requests from employees:
   - Employee name
   - Leave type
   - Start/End dates
   - Total days
   - Reason
   - **Leave balances** (Vacation, Sick, Personal)
3. Click **Approve** or **Reject**
4. If rejecting, add notes explaining why
5. Click **Confirm**

**After Approval:**
- Status changes to "Approved"
- Leave appears on calendar automatically
- Employee can see approved leave in calendar

**After Rejection:**
- Status changes to "Rejected"
- Employee can see rejection reason
- Leave does NOT appear on calendar

### Leave Balances (Manager)

When approving requests, you see:
- **Vacation Balance:** Days remaining
- **Sick Balance:** Days remaining
- **Personal Balance:** Days remaining

**Use this to decide if employee has enough leave!**

---

## Payroll

**Access:** Sidebar → **Payroll**

### Manager View

**Payroll Calculations:**
- View all payroll calculations
- Filter by pay period
- Employee name, hours, gross pay
- Deductions, net pay

**Process Payroll:**
- Calculate payroll for period
- Review before finalizing
- Export to Excel
- Submit payroll

**Payroll Submissions:**
- History of submitted payrolls
- Period name, date range
- Submission date
- Total amount

### User View

**View Your Payroll:**
- See only your own payroll records
- Hours worked
- Gross pay
- Deductions
- Net pay
- Pay period

**Search Hidden:**
- Cannot search other employees
- Only your data visible

---

## Performance Management

**Access:** Sidebar → **Performance**

### Performance Reviews

**Create Review:**
- Select employee
- Review period
- Performance rating
- Goals achieved
- Areas of improvement
- Overall score

**View Reviews:**
- Past reviews
- Review history
- Performance trends

### Goals & Objectives

**Set Goals:**
- Goal description
- Target date
- Status (Not Started, In Progress, Completed)
- Progress %

**360° Feedback:**
- Peer reviews
- Manager feedback
- Self-assessment

---

## Recruiting

**Access:** Sidebar → **Recruiting**

### Job Postings

**Create Job Posting:**
- Job title
- Department
- Job type (Full-time/Part-time/Contract)
- Description
- Requirements
- Salary range
- Application deadline

**Manage Postings:**
- View all active jobs
- Edit/close postings
- View applications

### Candidates

**Candidate Pipeline:**
- New applicants
- Under review
- Interview scheduled
- Offer extended
- Hired
- Rejected

**Candidate Details:**
- Resume
- Contact info
- Application date
- Status
- Interview notes

### Interviews

**Schedule Interview:**
- Select candidate
- Interview type (Phone, Video, In-person)
- Date & time
- Interviewer(s)
- Notes

---

## Compliance

**Access:** Sidebar → **Compliance**

### Training Records

**Manage Training:**
- Employee name
- Training type
- Completion date
- Expiry date
- Certificate

**Track Compliance:**
- WHMIS training
- Safety certifications
- Required courses
- Expiry alerts

### Documents

**Upload Documents:**
- Contracts
- Policies
- Handbooks
- Certifications

**Document Management:**
- Version control
- Expiry tracking
- Employee acknowledgment

---

## Benefits

**Access:** Sidebar → **Benefits**

### Benefits Enrollment

**Available Plans:**
- Health insurance
- Dental insurance
- Vision insurance
- Life insurance
- Retirement (401k/RRSP)

**Enroll in Benefits:**
- Select plan
- Choose coverage level
- Add dependents
- Review costs
- Submit enrollment

### View Your Benefits (User)

- Current enrollments
- Coverage details
- Costs/deductions
- Beneficiaries

---

## Bonuses & Commissions

**Access:** Sidebar → **Bonuses & Commissions**

### Manager View

#### Upload Bonuses Tab

**Upload Excel File:**

1. Click **Upload Bonuses** or **Upload Commissions**
2. Select Excel file
3. **Required columns:**
   - Employee Name or ID
   - Amount
   - Period
   - Type (Bonus/Commission)
4. Click **Upload**
5. System imports and calculates

**View Uploads:**
- All uploaded bonus/commission files
- Date, employee count
- Total amount

#### Bonuses Tab

**View All Bonuses:**
- Employee name
- Bonus amount
- Period
- Date paid
- Type

**Add Manual Bonus:**
- Select employee
- Enter amount
- Select period
- Add notes
- Submit

#### Commissions Tab

**View All Commissions:**
- Employee name
- Commission amount
- Sales/performance data
- Period
- Date calculated

**Monthly/Quarterly Reports:**
- Commission summaries
- Top performers
- Trends

### User View

**View Your Bonuses:**
- Your bonus history
- Amounts, dates
- Periods

**View Your Commissions:**
- Your commission history
- Calculation breakdown
- Period totals

**No Upload Access:**
- Cannot upload Excel files
- Cannot see other employees
- View-only access

---

## Settings

**Access:** Sidebar → **Settings**

### User Preferences Tab

**Theme:**
- **Dark Mode** (default) - Black background, easier on eyes
- **Light Mode** - White background, bright

**Language:**
- English (en)
- Spanish (es)
- French (fr)

**Note:** UI translations not yet implemented - stays in English

### Notifications Tab

**Email Notifications:**
- Toggle ON/OFF
- Receive updates via email

**Push Notifications:**
- Toggle ON/OFF
- Browser notifications

**SMS Notifications:**
- Toggle ON/OFF
- Text message alerts

**⚠️ Note:** Notification sending not yet implemented - toggles save preference only

### Security Tab

**This is the most important tab!**

#### Two-Factor Authentication (MFA)

**Setup MFA:**
1. Toggle **Two-Factor Authentication** to **ON**
2. Modal opens with QR code
3. Scan with authenticator app
4. Enter 6-digit code
5. **Save backup codes** (displayed once!)
6. Click **Enable MFA**

**⚠️ IMPORTANT:** Save your backup codes! If you lose your phone, these are the only way to access your account.

**Disable MFA:**
1. Toggle to **OFF**
2. Confirm warning
3. MFA disabled (not recommended!)

#### Change Password

1. Click **Change Password** button
2. Modal opens
3. Enter:
   - Current password
   - New password (min 8 chars)
   - Confirm new password
4. Click **Change Password**
5. Success! Password updated

**Password Rules:**
- Minimum 8 characters
- Cannot be same as current
- Cannot reuse last 5 passwords
- Expires every 90 days

#### Trusted Devices

**View Trusted Devices:**
- Device name (OS + Browser)
- Last used date
- IP address
- Expires in X days

**Revoke Single Device:**
1. Click **Revoke** on device
2. Confirm
3. Device removed - will need MFA next login

**Revoke All Devices:**
1. Click **Revoke All**
2. Confirm warning
3. All devices removed
4. You'll need MFA on next login (even current device)

**Use Cases:**
- Lost/stolen phone → Revoke that device
- Security concern → Revoke all devices
- New phone → Old device auto-expires after 7 days

#### Session Timeout

**Default:** 30 minutes

Change timeout duration (minutes):
- 15, 30, 60, 120 minutes
- Saves to database
- Applies to your account

#### Password Requirements

**Strength Levels:**
- Weak (not recommended)
- Medium
- **Strong** (default)

---

## System Testing

**Access:** Sidebar → **Testing** (Manager only)

### Test Suite

Run comprehensive system tests:

**Test Categories:**
1. **Authentication System**
   - Login/logout
   - Session management
   - MFA functionality

2. **API Endpoints** (16 tests)
   - All API endpoints tested
   - Response validation
   - Error handling

3. **Database & Data Validation**
   - Connection tests
   - Schema validation
   - Data integrity

4. **Core Features**
   - Onboarding/offboarding
   - Payroll calculations
   - Leave workflow

5. **Responsive Design**
   - Mobile layout
   - Tablet layout
   - Desktop layout

6. **Performance**
   - Load times
   - API response times
   - Overall responsiveness

**Run Tests:**
1. Click **Run All Tests**
2. Watch real-time results
3. Green ✅ = Passed
4. Yellow ⚠️ = Warning
5. Red ❌ = Failed

**System Info:**
- Browser details
- Screen size
- Viewport
- Timezone

---

## Troubleshooting

### Login Issues

**Problem:** Can't login - "Invalid credentials"

**Solutions:**
1. Check username is correct (e.g., `JohnSmith` not `john.smith`)
2. Check password (case-sensitive)
3. Try default password: `password123`
4. Contact HR to reset password

---

**Problem:** MFA code not working

**Solutions:**
1. Ensure time on phone is correct (auto-sync)
2. Wait for new code (refreshes every 30 seconds)
3. Try backup codes (from initial setup)
4. Contact HR to disable MFA

---

**Problem:** Session expired

**Solution:**
- Sessions expire after 30 minutes of inactivity
- Just login again
- Save work more frequently

---

### Upload Issues

**Problem:** Excel upload fails - "Invalid format"

**Solutions:**
1. Check file is .xlsx or .xls
2. Ensure required columns present:
   - Employee Name
   - Date (YYYY-MM-DD format)
   - Hours/Amount
3. No special characters in names
4. Remove empty rows
5. Save as new file and retry

---

**Problem:** Employee not found in upload

**Solutions:**
1. Check exact name matches system (e.g., "John Smith" not "J Smith")
2. Check employee exists in Employee Management
3. Check employee status is "Active" not "Terminated"
4. Case-sensitive - must match exactly

---

### Leave Request Issues

**Problem:** Can't submit leave request

**Solutions:**
1. Ensure all required fields filled (*, asterisk)
2. End date must be same or after start date
3. Check you have leave balance remaining
4. Try different browser/clear cache

---

**Problem:** Approved leave not showing on calendar

**Solutions:**
1. Refresh page
2. Check "Leave Calendar" tab selected
3. Ensure request was actually approved (check "My Requests")
4. Wait a few minutes - can take time to sync

---

### Password Issues

**Problem:** Password expired, account locked

**Solution:**
- Contact HR to reset password
- Cannot self-reset after expiry

---

**Problem:** Can't change password - "Cannot reuse password"

**Solutions:**
1. System blocks last 5 passwords
2. Choose a completely different password
3. Add numbers/symbols to make it unique

---

### Performance Issues

**Problem:** System is slow

**Solutions:**
1. Check internet connection
2. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E
   - Firefox: Ctrl+Shift+Delete
3. Try different browser
4. Close other tabs/apps
5. Check Render.com status (may be server issue)

---

**Problem:** Page not loading

**Solutions:**
1. Refresh page (F5 or Cmd+R)
2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
3. Clear cache and cookies
4. Try incognito/private mode
5. Check firewall/VPN settings

---

### Data Not Showing

**Problem:** Dashboard shows zeros

**Solutions:**
1. Click **Refresh** button
2. Change time range filter
3. Check you have data in system (employees, timecards, etc.)
4. Ensure you're logged in as Manager (users don't see dashboard)

---

**Problem:** Can't see other employees (Manager role)

**Solutions:**
1. Logout and login again (role might not have updated)
2. Check you have "Manager" role (ask HR)
3. Check user_role in Settings
4. Clear browser cache

---

### Contact Support

**If issues persist:**

📧 **Email:** hr@cclogistics.com  
📞 **Phone:** [Your HR Phone Number]  
🕒 **Hours:** Monday-Friday, 9 AM - 5 PM EST

**When contacting support, provide:**
- Your username
- Browser & version (e.g., Chrome 118)
- What you were trying to do
- Error message (screenshot if possible)
- Date & time of issue

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open search (future) |
| `Esc` | Close modals |
| `Ctrl + R` | Refresh page |
| `Alt + D` | Go to Dashboard (Manager) |
| `Alt + E` | Go to Employees |
| `Alt + T` | Go to Time Tracking |
| `Alt + L` | Go to Leave Management |
| `Alt + S` | Go to Settings |

---

## Appendix B: Default Values

| Setting | Default Value |
|---------|---------------|
| Probation Period | 3 months |
| Session Timeout | 30 minutes |
| Password Expiry | 90 days |
| Default Password | `password123` |
| Hourly Rate | $25 |
| Theme | Dark Mode |
| Language | English (en) |
| Overtime Threshold | 40 hours/week |
| Trusted Device Duration | 7 days |

---

## Appendix C: Excel Upload Templates

### Timecard Upload Template

| Employee Name | Date | Hours Worked | Job Type | Notes |
|---------------|------|--------------|----------|-------|
| John Smith | 2025-10-01 | 8 | Regular | - |
| John Smith | 2025-10-02 | 8.5 | Overtime | Late project |
| Jane Doe | 2025-10-01 | 7.5 | Regular | - |

**Column Descriptions:**
- **Employee Name** (required): Exact match to system name
- **Date** (required): YYYY-MM-DD format
- **Hours Worked** (required): Decimal format (e.g., 8.5)
- **Job Type** (optional): Regular, Overtime, Holiday
- **Notes** (optional): Any comments

### Bonuses Upload Template

| Employee Name | Amount | Period | Type | Notes |
|---------------|--------|--------|------|-------|
| John Smith | 500 | 2025-Q4 | Performance | Exceeded targets |
| Jane Doe | 750 | 2025-10 | Sales | Top seller |

**Column Descriptions:**
- **Employee Name** (required): Exact match
- **Amount** (required): Numeric, no $ sign
- **Period** (required): YYYY-MM or YYYY-QX
- **Type** (required): Performance, Sales, Holiday
- **Notes** (optional): Reason for bonus

### Commissions Upload Template

| Employee Name | Commission | Sales Amount | Period | Notes |
|---------------|------------|--------------|--------|-------|
| John Smith | 1250 | 25000 | 2025-10 | 5% commission |
| Jane Doe | 2100 | 42000 | 2025-10 | 5% commission |

---

## Glossary

**Terms & Definitions:**

- **2FA/MFA** - Two-Factor Authentication / Multi-Factor Authentication - Extra security layer requiring phone app code
- **Active Employee** - Currently employed, not terminated
- **Authenticator App** - Mobile app that generates 6-digit codes for MFA (Google Authenticator, Authy, etc.)
- **Backup Codes** - One-time use codes for MFA if you lose your phone (save these!)
- **Dashboard** - Main overview page with analytics and metrics
- **FMLA** - Family and Medical Leave Act (US labor law)
- **HR** - Human Resources
- **Manager Role** - Full system access (HR/Admin)
- **MFA** - Multi-Factor Authentication (same as 2FA)
- **Onboarding** - Process of adding a new employee
- **Payroll** - Employee payment processing
- **Probation Period** - Initial employment period (default 3 months)
- **RBAC** - Role-Based Access Control (User vs Manager permissions)
- **Session** - Your logged-in period (expires after 30 min inactive)
- **SIN** - Social Insurance Number (Canada) or SSN (US)
- **Terminated Employee** - No longer employed
- **Timecard** - Record of hours worked
- **Trusted Device** - Device that skips MFA for 7 days
- **User Role** - Limited access (employee, can only see own data)
- **WHMIS** - Workplace Hazardous Materials Information System

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 15, 2025 | Initial release - Complete user manual |

---

## Copyright & Disclaimer

**© 2025 C&C Logistics & Warehouse**

This manual is for internal use only. All information is confidential and proprietary. Do not distribute outside the organization.

**Disclaimer:** Features and screenshots may change as the system is updated. Contact HR for the latest information.

---

**End of User Manual**

For questions or feedback on this manual, contact: hr@cclogistics.com

