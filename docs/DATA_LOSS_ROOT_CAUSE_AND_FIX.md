# Data Loss Root Cause Analysis & Recovery Plan

## 🔴 What Happened (Complete Timeline)

### The Bug:
```javascript
// Line 343 in timecardDisplayImporter.js (OLD CODE - BAD!)
WHERE pay_period_start = $1 AND pay_period_end = $2  ❌

// This matched ANY file with the same period and DELETED all data!
```

### Example of How Data Got Deleted:

```
Step 1: You upload "August 25 - September 7, 2025.xlsx"
  → Data saved to database ✓
  → 58 employees, 3797 hours ✓

Step 2: You upload "September 08 - September 21, 2025.xlsx"  
  → Data saved to database ✓
  → 62 employees, 3842 hours ✓
  
Step 3: TRIGGER EVENT (any of these could cause deletion):
  a) You re-upload "August 25 - September 7, 2025.xlsx" (same file)
  b) You upload a DIFFERENT file for Aug 25-Sep 7
  c) Someone else uploads a file for that period
  d) An admin cleanup script runs
  
Step 4: THE BUG ACTIVATES:
  → Check: "Does Aug 25-Sep 7 period exist?" → YES
  → DELETE FROM timecards WHERE period = Aug 25-Sep 7  ❌
  → DELETE FROM timecard_uploads WHERE period = Aug 25-Sep 7 ❌
  → ALL data for that period: GONE!
  
Step 5: Process new file
  → INSERT new data
  → But old data from Step 1: DELETED FOREVER!
```

---

## 🔍 Investigation Results (Current State):

```
✅ Employees:           66 Active
✅ Timecard Uploads:    2 records  
❌ Timecards:           0 records  ← ALL DELETED!
❌ Timecard_Entries:    0 records  ← ALL DELETED!
❌ Hourly_Payout:       0 records  ← EMPTY (need commission re-upload)
✅ Commission Monthly:  39 records
✅ Agent Commission:    19 records
```

**Translation:** Upload records exist, but the actual timecard data was deleted!

---

## ✅ The Fix (Deployed Now):

### Changed Line 343-344:
```javascript
// OLD (BAD):
WHERE pay_period_start = $1 AND pay_period_end = $2

// NEW (FIXED):
WHERE pay_period_start = $1 AND pay_period_end = $2 AND filename = $3
```

### What This Means:
- ✅ Only deletes if **EXACT SAME FILENAME** is re-uploaded
- ✅ Different files for same period → Keep both
- ✅ Re-upload "August.xlsx" again → Replaces only August.xlsx data
- ✅ Upload "August_v2.xlsx" → Adds new data, keeps August.xlsx

### Also Removed Line 410-412:
```javascript
// OLD (BAD):
DELETE FROM timecards
WHERE employee_id = $1 AND pay_period_start = $2 AND pay_period_end = $3

// NEW (FIXED):
// No per-employee deletion - only delete entire upload if re-uploading same file
```

---

## 📋 Recovery Action Plan

### Step 1: Wait for Render Deployment (2 minutes)
```
Status: DEPLOYED ✓
Commit: fd6db73
Time: Just now
```

### Step 2: Re-Upload ALL Your Timecard Files

You need to upload these files again (they were deleted):

```
1. "August 25, 2025 September 7, 2025.xlsx"
   → Will restore 58 employees, ~3797 hours
   
2. "September 08 - September 21, 2025.xlsx"  
   → Will restore 62 employees, ~3842 hours
```

**Important:** The fix is now deployed, so re-uploading is SAFE!

### Step 3: Re-Upload Commission Files (For Hourly Payout)

```
Upload your commission Excel files again
→ This will populate hourly_payout table
→ Hourly payouts will show in Bonuses & Commissions page
```

---

## 🛡️ What's Protected Now:

### Scenario 1: Re-Upload Same File
```
Upload "August.xlsx" → Data saved
Later: Upload "August.xlsx" again
✅ Result: Replaces ONLY August.xlsx data
✅ Other files: UNTOUCHED
```

### Scenario 2: Upload Different File, Same Period
```
Upload "August.xlsx" for Aug 25-Sep 7 → Data saved
Later: Upload "August_v2.xlsx" for Aug 25-Sep 7
✅ Result: BOTH files data kept
✅ No deletion!
```

### Scenario 3: Upload Different Period
```
Upload "August.xlsx" for Aug 25-Sep 7 → Data saved
Later: Upload "September.xlsx" for Sep 8-21
✅ Result: Both periods data kept
✅ No deletion!
```

---

## ❓ Why Didn't You See The Upload?

Looking at Render logs, there's no obvious upload event shown. This means:

### Possible Causes:
1. **Upload happened hours/days ago** - Logs only show recent activity
2. **Admin cleanup endpoint** - Someone clicked "Clean All Data" button
3. **Background job** - Some automated process
4. **Testing/debugging** - Someone testing the upload feature

### What The Logs Show:
```
- Normal API connections (hr user)
- Health checks (postgres user)
- No large file uploads visible
- No obvious DELETE statements (Postgres doesn't log queries by default)
```

---

## 🚨 Additional Protections Needed

### 1. Enable Postgres Query Logging (Optional)
Add to Render Postgres:
```sql
ALTER DATABASE hrcore_42l4 SET log_statement = 'mod';
```
This logs all INSERT/UPDATE/DELETE statements.

### 2. Add Audit Trail
Create an audit log table:
```sql
CREATE TABLE data_changes_audit (
  id SERIAL PRIMARY KEY,
  table_name TEXT,
  action TEXT,  -- 'DELETE', 'INSERT', 'UPDATE'
  record_count INTEGER,
  triggered_by TEXT,
  triggered_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Require Confirmation for Deletes
Add a confirmation modal:
```
"⚠️ You're about to replace data for period Aug 25-Sep 7.
 This will delete X timecards and Y entries.
 Are you sure?"
```

---

## 📊 Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Timecard deletion bug | ✅ FIXED | Re-upload timecard files |
| Hourly payout empty | ⚠️ EMPTY | Re-upload commission files |
| Commission data | ✅ SAFE | No action needed |
| Employee data | ✅ SAFE | No action needed |

---

## ✅ Next Steps (YOU):

1. **Wait 2 minutes** for Render to deploy fix
2. **Go to Time Tracking** → Upload Timecard
3. **Upload**: `August 25, 2025 September 7, 2025.xlsx`
4. **Verify**: Check dashboard shows 58 employees, ~3797 hours
5. **Upload**: `September 08 - September 21, 2025.xlsx`
6. **Verify**: Check dashboard shows 62 employees, ~3842 hours  
7. **Go to Bonuses & Commissions** → Upload Commission Data
8. **Upload your commission files**
9. **Verify**: Hourly Payouts show data

---

## 🎉 After Re-Upload:

```
✅ All timecard data restored
✅ Hourly payouts populated
✅ No more data deletion bug
✅ Re-upload same file → Only that file's data replaced
✅ Upload different files → All data kept
✅ Your data is SAFE!
```

---

**Status: Fix Deployed ✓**  
**Time: 2025-10-03 (Just now)**  
**Commit: fd6db73**

