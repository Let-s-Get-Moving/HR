# Data Cleanup Guide

This guide explains how to remove all mock/test data from the HR system database.

## ⚠️ IMPORTANT WARNING

**The cleanup operation is DESTRUCTIVE and CANNOT be undone!**

- All employee records will be permanently deleted
- All related data (timecards, payroll, commissions, etc.) will be removed
- Database ID sequences will be reset to 1
- This operation should only be run when you want to start fresh

## 🗑️ What Gets Removed

The cleanup script removes ALL data from the following tables:

### Employee Data
- `employees` - All employee records
- `employee_addresses` - Employee addresses
- `employee_bank_accounts` - Bank account information
- `employee_emergency_contacts` - Emergency contacts
- `employee_identifiers` - SIN numbers, work permits
- `employee_compensation` - Salary/wage history
- `employee_status_history` - Employment status changes

### Time & Payroll
- `time_entries` - Clock in/out records
- `timecard_entries` - Timecard line items
- `timecards` - Timecard headers
- `payroll_calculations` - Payroll processing records

### Financial
- `employee_commission_monthly` - Monthly commission records
- `agent_commission_us` - Agent commission data
- `hourly_payout` - Hourly payout records
- `bonuses` - Bonus payments

### HR Data
- `leave_requests` - Vacation/leave requests
- `performance_reviews` - Performance evaluations
- `performance_goals` - Employee goals
- `documents` - Uploaded employee documents
- `training_records` - Training certifications
- `termination_details` - Termination records

### Recruiting
- `job_postings` - Job postings
- `applications` - Job applications

### Compliance
- `alerts` - Compliance alerts

## 🚀 How to Run the Cleanup

### Prerequisites

1. Set your database connection string as an environment variable:

```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```

For local Docker setup:
```bash
export DATABASE_URL="postgresql://hr:hrpass@localhost:5432/hrcore"
```

For Render or cloud databases:
```bash
export DATABASE_URL="your_render_database_url_here"
```

### Running the Cleanup Script

1. **Navigate to the scripts directory:**
```bash
cd scripts
```

2. **Run the cleanup script:**
```bash
node remove-all-mock-data.js
```

3. **The script will:**
   - Show you the current count of records in each table
   - Wait 3 seconds before starting deletion
   - Delete all data in the correct order (respecting foreign keys)
   - Reset all ID sequences to 1
   - Show you a summary of what was deleted

### Example Output

```
🗑️  Starting comprehensive mock data cleanup...

📊 Current database status:
   employees: 248 records
   time_entries: 5430 records
   leave_requests: 45 records
   performance_reviews: 28 records
   ...

⚠️  WARNING: This will DELETE ALL data from the tables above!
⚠️  This action CANNOT be undone!

🔥 Starting deletion in 3 seconds...

🗑️  Deleting data...
   → Deleting alerts...
   → Deleting job applications...
   → Deleting job postings...
   ...
   → Deleting all employees...
   ✅ Deleted 248 employees

🔄 Resetting ID sequences...
   ✅ Sequences reset

✅ Mock data cleanup complete!
💡 Database is now clean and ready for real data

📊 Summary:
   Employees deleted: 248
   Time entries deleted: 5430
   Leave requests deleted: 45
   ...
```

## 🔄 After Cleanup

Once the cleanup is complete, your database will be in a clean state:

1. **All employee-related data is removed**
2. **Schema remains intact** (tables, columns, constraints)
3. **System tables preserved** (departments, locations, leave types, etc.)
4. **ID sequences reset** - Next employee will be ID #1

## 📊 Importing New Data

After cleanup, you can import real production data:

### Option 1: Excel Timecard Upload
1. Navigate to the Timecards page in the web interface
2. Upload an Excel timecard file
3. System will automatically create employee records

### Option 2: Manual Entry
1. Navigate to the Employees page
2. Click "Add Employee"
3. Fill in employee details and save

### Option 3: Commission Upload
1. First ensure employees exist (via timecards or manual entry)
2. Navigate to Bonuses & Commissions
3. Upload commission data
4. System will match to existing employees

## 🛟 Recovery

**There is NO automatic recovery for this operation!**

If you need to recover data:
1. Restore from a database backup (if you have one)
2. Re-import data from source files
3. Re-enter data manually

## 💡 Best Practices

### Before Running Cleanup

1. **Create a database backup:**
```bash
# For PostgreSQL
pg_dump -h localhost -U hr -d hrcore > backup_$(date +%Y%m%d).sql
```

2. **Verify DATABASE_URL:**
```bash
echo $DATABASE_URL
```

3. **Ensure you're targeting the correct database** (not production!)

### Testing the Cleanup

If you want to test the cleanup:
1. Create a separate test database
2. Point DATABASE_URL to the test database
3. Run the cleanup script
4. Verify results before running on production

## 🔍 Troubleshooting

### Error: "DATABASE_URL environment variable is not set"
**Solution:** Set the DATABASE_URL environment variable before running

### Error: Foreign key constraint violation
**Solution:** The script handles this automatically by deleting in the correct order. If this occurs, report as a bug.

### Error: Connection refused
**Solution:** Ensure the database is running and the connection string is correct

### Script hangs or takes too long
**Solution:** This is normal for large datasets. Wait for completion. The script shows progress as it works.

## 🔒 Security Note

The cleanup script requires full database access. Ensure:
- You have proper database credentials
- You're authorized to delete production data
- You've notified relevant stakeholders
- You have backups before running

## 📝 Script Location

The cleanup script is located at:
```
/scripts/remove-all-mock-data.js
```

Source code is available for review before running.

---

**Last Updated:** October 2, 2025

**⚠️ Remember: This operation is permanent and cannot be undone. Always backup first!**

