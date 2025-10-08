# 🚀 Onboarding Import System - Quick Start

## ✅ What Was Built

A complete system to import employee onboarding data from your 2 XLSX files into the database, with document management UI.

### Files Created:
1. **`db/init/011_onboarding_fields.sql`** - Database migration (adds new fields)
2. **`scripts/import-onboarding-data.js`** - Import script for XLSX files
3. **`docs/ONBOARDING_IMPORT_SYSTEM.md`** - Full documentation
4. **Enhanced Frontend** - Beautiful document management UI

### Files Modified:
1. **`api/src/routes/employees.js`** - Added document upload/download/delete endpoints
2. **`web/src/pages/EmployeeProfile.jsx`** - Enhanced Documents tab with upload functionality

---

## 🎯 How to Use (3 Steps)

### Step 1: Run Database Migration

Run this on your Render database:

```bash
# Option A: Via Render dashboard SQL console
# Copy/paste contents of: db/init/011_onboarding_fields.sql

# Option B: Via command line (if you have psql)
psql postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4 < db/init/011_onboarding_fields.sql
```

This adds new fields to `employees` table:
- SIN number, bank info, address, emergency contacts
- Contract status, gift card tracking
- Import metadata

### Step 2: Run Import Script

```bash
cd /Users/admin/Documents/GitHub/HR
node scripts/import-onboarding-data.js
```

This will:
- ✅ Parse both onboarding XLSX files
- ✅ Match employees by name (first + last)
- ✅ Create new or update existing employees
- ✅ Store document URLs (Monday.com, Google Drive links)
- ✅ Print summary report

**Expected output:**
```
🚀 Starting Onboarding Data Import...
📊 Total unique employees to process: 65
   ✚ Creating: John Smith
   ↻ Updating: Jane Doe
✅ Import Complete!
   • Created: 28 new employees
   • Updated: 37 existing employees
```

### Step 3: View in UI

1. Deploy frontend/backend changes to Render
2. Log into HR system
3. Click any employee → **Documents** tab
4. You'll see imported documents categorized:
   - 💰 Financial Documents (void cheques, SIN)
   - 🛂 Immigration Documents (work permits, PR cards)
   - 📄 Employment Documents (contracts)
   - 📎 Other Documents

5. Click **👁️ View** → Opens document URL in new tab
6. Click **📤 Upload Document** → Add new documents manually

---

## 📋 What Each XLSX File Contains

### File 1: `Onboarding_Form_1759757641.xlsx` (Monday.com)
- 45 employees
- Full onboarding data with status tracking
- Document URLs for contracts, void cheques, work permits, SIN docs
- Complete bank information

### File 2: `Onboarding Form (Responses).xlsx` (Google Forms)
- 32 employees
- Similar data structure
- Google Drive document links
- Some overlap with File 1

**Import handles duplicates automatically** - uses File 1 data when employee exists in both.

---

## 🔑 Key Features

### Document Handling
- **Imported docs**: Stored as URLs (opens in new tab)
- **Manual uploads**: Stored as binary in database (downloadable)
- **Categories**: Financial, Immigration, Employment, Personal, Other
- **Status tracking**: Signed/Pending badges

### Employee Matching
- Matches by name: `first_name + last_name` (case-insensitive)
- Safe to re-run (won't create duplicates)
- Updates existing employees with new data

### Security
- ⚠️ **SIN and bank account numbers should be encrypted** (implement later)
- Documents stored in database (backed up with DB)
- Access requires authentication

---

## 🧪 Testing

### 1. Verify Migration
```sql
-- Check new fields exist
SELECT 
  sin_number, bank_name, emergency_contact_name, 
  contract_status, onboarding_source, imported_at
FROM employees LIMIT 1;
```

### 2. Verify Import
```sql
-- Check imported employees
SELECT first_name, last_name, onboarding_source, imported_at 
FROM employees 
WHERE onboarding_source IN ('Monday.com', 'Google Forms');

-- Check documents
SELECT e.first_name, e.last_name, d.doc_type, d.file_url
FROM employees e
JOIN documents d ON d.employee_id = e.id
WHERE d.file_url IS NOT NULL;
```

### 3. Test UI
1. Open employee profile
2. Go to Documents tab
3. Verify documents appear categorized
4. Click "View" → should open URL
5. Click "Upload Document" → upload test PDF
6. Verify uploaded doc appears with file size

---

## 📁 New Employee Fields

| Field | Example Value | Notes |
|-------|---------------|-------|
| `full_address` | "6 Gower Crescent Brampton L6R 0R8" | Home address |
| `sin_number` | "949714851" | 🔒 Sensitive |
| `sin_expiry_date` | "2025-10-15" | For work permits |
| `bank_name` | "Scotia Bank" | Bank name |
| `bank_transit_number` | "60202" | 5 digits |
| `bank_account_number` | "1277928" | 🔒 Sensitive |
| `emergency_contact_name` | "Jane Smith" | Emergency contact |
| `emergency_contact_phone` | "4161234567" | Emergency phone |
| `contract_status` | "Signed" | Not Sent/Sent/Signed/Pending |
| `gift_card_sent` | true | Boolean flag |
| `onboarding_source` | "Monday.com" | Import source |
| `imported_at` | "2025-10-07 10:30:00" | Import timestamp |

---

## 🐛 Troubleshooting

### "Column does not exist" error
→ Run migration first (Step 1)

### "Cannot find module 'xlsx'" error
→ Run `npm install` in project root

### "ENOENT: no such file or directory"
→ Make sure XLSX files are in `/Users/admin/Documents/GitHub/HR/`

### Documents don't show in UI
→ Check browser console for errors
→ Verify API endpoints are deployed

### Import reports 0 employees
→ Check XLSX file names match exactly
→ Verify files are in correct directory

---

## 🔄 Re-running Import

Safe to run multiple times:
- Won't create duplicate employees
- Updates existing records
- Adds new employees found in files
- Skips documents that already exist

Use cases:
- Monthly onboarding batches
- Correcting data errors
- Adding new hires

---

## 📚 Full Documentation

See **`docs/ONBOARDING_IMPORT_SYSTEM.md`** for:
- Complete API reference
- Security best practices
- Advanced features
- Future enhancements
- Detailed troubleshooting

---

## ✨ Summary

You now have a complete onboarding import system that:
- ✅ Imports employee data from 2 XLSX files
- ✅ Stores document URLs (Monday.com, Google Drive)
- ✅ Provides beautiful categorized document UI
- ✅ Supports manual document uploads (passport, etc.)
- ✅ Handles view/download/delete operations
- ✅ Matches employees by name (no duplicates)
- ✅ Safe to run multiple times

**Next**: Run the 3 steps above and you're done! 🎉

