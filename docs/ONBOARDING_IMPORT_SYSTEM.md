# Onboarding Data Import System

## Overview

This system allows importing employee onboarding data from XLSX files (Monday.com and Google Forms exports) into the HR database, including:
- Employee personal information (name, DOB, address, phone, email)
- Financial details (SIN, bank account, transit number)
- Emergency contact information
- Document URLs (contracts, void cheques, work permits, SIN documents)

## Database Changes

### New Fields Added to `employees` Table

| Field Name | Type | Description | Security |
|------------|------|-------------|----------|
| `full_address` | TEXT | Complete home address with postal code | Normal |
| `sin_number` | TEXT | Social Insurance Number | 🔒 Should be encrypted |
| `sin_expiry_date` | DATE | SIN expiry (for work permits) | Normal |
| `bank_name` | TEXT | Bank name (e.g., "Scotia Bank") | Normal |
| `bank_transit_number` | TEXT | 5-digit transit number | Normal |
| `bank_account_number` | TEXT | Bank account number | 🔒 Should be encrypted |
| `emergency_contact_name` | TEXT | Emergency contact full name | Normal |
| `emergency_contact_phone` | TEXT | Emergency contact phone | Normal |
| `contract_status` | TEXT | Contract status: Not Sent/Sent/Signed/Pending | Normal |
| `contract_signed_date` | DATE | Date contract was signed | Normal |
| `gift_card_sent` | BOOLEAN | Gift card sent flag | Normal |
| `onboarding_source` | TEXT | Import source (Monday.com/Google Forms/Manual) | Normal |
| `imported_at` | TIMESTAMP | When data was imported | Normal |

### Enhanced `documents` Table

New columns added:
- `file_url` - Store external document URLs (Monday.com, Google Drive, etc.)
- `file_data` - Store actual document binary (for manual uploads)
- `file_size` - File size in bytes
- `mime_type` - MIME type (e.g., application/pdf)
- `uploaded_by` - Reference to user who uploaded
- `notes` - Additional notes about the document
- `document_category` - Financial/Immigration/Employment/Personal/Other

New document types supported:
- **Financial**: `VoidCheque`, `DirectDeposit`, `SIN_Document`
- **Immigration**: `WorkPermit`, `PR_Card`, `Citizenship`, `StudyPermit`, `Visa`
- **Employment**: `Contract`, `PolicyAck`
- **Other**: General documents

### Database View

**`v_employee_onboarding_status`** - Shows onboarding completion status for each employee:
- Lists all employees with Active/On Leave status
- Shows document counts by category
- Calculates onboarding completion status (Complete/In Progress/Not Started)

## Files Created/Modified

### Database Migration
- **`db/init/011_onboarding_fields.sql`** - Adds new fields to employees and documents tables

### Import Script
- **`scripts/import-onboarding-data.js`** - Main import script
  - Parses both XLSX files
  - Matches employees by name (first + last)
  - Creates/updates employee records
  - Stores document URLs
  - Handles duplicates between files

### Backend API
- **`api/src/routes/employees.js`** - Enhanced with document endpoints:
  - `GET /api/employees/:id/documents` - List all documents
  - `POST /api/employees/:id/documents` - Upload new document
  - `GET /api/employees/:id/documents/:docId/download` - Download/view document
  - `DELETE /api/employees/:id/documents/:docId` - Delete document

### Frontend
- **`web/src/pages/EmployeeProfile.jsx`** - Enhanced Documents tab:
  - Categorized document display (Financial/Immigration/Employment/Other)
  - Document upload modal with file picker
  - View/download documents (handles both URLs and uploaded files)
  - Delete documents
  - Beautiful UI with icons and status badges

## Usage

### Step 1: Run Database Migration

```bash
# Connect to your Render database and run:
psql postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4 -f db/init/011_onboarding_fields.sql
```

Or use the migration runner:
```bash
cd /Users/admin/Documents/GitHub/HR
node execute-sql-migration.js db/init/011_onboarding_fields.sql
```

### Step 2: Run Import Script

```bash
cd /Users/admin/Documents/GitHub/HR
node scripts/import-onboarding-data.js
```

The script will:
1. Parse `Onboarding_Form_1759757641.xlsx` (Monday.com export)
2. Parse `Onboarding Form (Responses).xlsx` (Google Forms responses)
3. Combine and deduplicate employees (matches by name)
4. For each employee:
   - Search for existing employee by name
   - Update existing OR create new employee
   - Add all personal, financial, and emergency contact info
   - Store document URLs for later access
5. Print summary report

**Expected Output:**
```
🚀 Starting Onboarding Data Import...

📄 Parsing Onboarding_Form_1759757641.xlsx...
✅ Parsed 45 employees from Onboarding_Form_1759757641.xlsx

📄 Parsing Onboarding Form (Responses).xlsx...
✅ Parsed 32 employees from Onboarding Form (Responses).xlsx

📊 Total unique employees to process: 65

============================================================
   ✚ Creating: John Smith
      📎 Added document: Contract
      📎 Added document: VoidCheque
      📎 Added document: WorkPermit
   ↻ Updating: Jane Doe
      📎 Added document: SIN_Document
...
============================================================

✅ Import Complete!

📈 Summary:
   • Created: 28 new employees
   • Updated: 37 existing employees
   • Errors: 0
   • Total processed: 65
```

### Step 3: Access Documents in UI

1. Log into HR system
2. Navigate to **Employees** page
3. Click on any employee to open their profile
4. Click **Documents** tab
5. You'll see:
   - **Financial Documents**: Void cheques, SIN documents, direct deposit forms
   - **Immigration Documents**: Work permits, PR cards, citizenship docs
   - **Employment Documents**: Contracts, policy acknowledgments
   - **Other Documents**: Any additional documents

6. To view a document:
   - Click **View** button → Opens URL in new tab (for onboarding imports)
   - Or downloads file (for manually uploaded docs)

7. To upload new documents:
   - Click **Upload Document** button
   - Select document type, category, and file
   - Add optional notes
   - Mark as signed if applicable
   - Click **Upload**

## Document Handling Strategy

### Imported Documents (from XLSX files)
- **Storage**: URL only (points to Monday.com or Google Drive)
- **Access**: When user clicks "View", opens external URL in new tab
- **Format**: PDF links from onboarding forms
- **Example**:
  ```
  https://lets-get-moving-squad.monday.com/protected_static/29089213/resources/2356061204/contract.pdf
  ```

### Manually Uploaded Documents
- **Storage**: Binary data in PostgreSQL `BYTEA` column
- **Access**: When user clicks "View", downloads/opens from database
- **Formats**: PDF, DOC, DOCX, JPG, PNG
- **Size Limit**: Reasonable file sizes (recommend < 10MB per file)

### Future: Download External Documents
If you want to download and store Monday.com/Google Drive docs locally:
1. Implement authentication for those services
2. Fetch documents during import
3. Store in `file_data` column instead of just URLs
4. Update import script to handle downloads

## Security Considerations

### Sensitive Data
**⚠️ IMPORTANT**: The following fields contain highly sensitive information:
- `sin_number` - Social Insurance Number
- `bank_account_number` - Bank account number

**Recommendations**:
1. **Encrypt at Rest**: Implement column-level encryption
2. **Encrypt in Transit**: Always use HTTPS/SSL
3. **Access Control**: Restrict to HR/Admin roles only
4. **Audit Logging**: Log all access to sensitive fields
5. **Data Retention**: Define retention policy for terminated employees

### Document Security
- Documents are stored in database (not file system)
- Access requires valid session/authentication
- Consider adding role-based access (only HR can view financial docs)
- External URLs (Monday.com/Google Drive) rely on their security

## Matching Logic

### Employee Matching by Name
The import script matches employees using:
```sql
LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
```

**Examples**:
- "John Smith" matches "john smith" (case-insensitive)
- "Jean-Paul Dubois" matches "Jean-Paul Dubois" (preserves hyphens)
- "Maria Garcia" does NOT match "Maria" or "Garcia" alone

**Handling Duplicates**:
- If same person exists in both files → uses Monday.com version (File 1)
- If multiple people have same name → matches first found in database
- Manual review recommended after import

## Recurring Imports

The import script is designed to be run multiple times:
- **Safe to re-run**: Won't create duplicates if employee already exists
- **Updates existing**: Refreshes data for matched employees
- **Adds new**: Creates any new employees not found in database
- **Preserves data**: Doesn't overwrite fields with NULL/empty values

**Use Cases**:
1. Monthly onboarding batch
2. Correcting data after initial import
3. Adding new hires from updated XLSX files

## Troubleshooting

### Import Errors

**Error**: `column "sin_number" does not exist`
- **Solution**: Run database migration first (`011_onboarding_fields.sql`)

**Error**: `Cannot find module 'xlsx'`
- **Solution**: Install dependencies: `npm install` in project root

**Error**: `ENOENT: no such file or directory`
- **Solution**: Ensure XLSX files are in project root directory

### Document Upload Errors

**Error**: `Failed to upload document: file too large`
- **Solution**: Check file size (< 10MB recommended for PDFs)
- **Alternative**: Store large files externally and use URLs

**Error**: `Document file not available`
- **Solution**: External URL may be broken or require authentication

### UI Issues

**Documents tab shows "No documents"**
- Check if documents were imported (query `documents` table)
- Verify `employee_id` matches
- Check console for API errors

**Upload button doesn't work**
- Check browser console for errors
- Verify user has write permissions
- Check network tab for failed API calls

## Next Steps

### Future Enhancements
1. **Encryption**: Add crypto for SIN and bank account numbers
2. **Bulk Download**: Download all Monday.com docs during import
3. **Document Preview**: PDF viewer in modal instead of new tab
4. **Audit Trail**: Log who accessed sensitive documents
5. **Email Notifications**: Alert HR when onboarding docs are incomplete
6. **Automated Reminders**: Remind employees to complete missing docs

### Maintenance
1. **Regular Backups**: Documents are in database, backup accordingly
2. **Cleanup Old Documents**: Archive documents for terminated employees
3. **Review Security**: Periodic security audits for sensitive data access
4. **Update Document Types**: Add new types as needed

## API Reference

### Get Employee Documents
```http
GET /api/employees/:id/documents
```

**Response**:
```json
[
  {
    "id": 123,
    "employee_id": 45,
    "doc_type": "VoidCheque",
    "file_name": "void_cheque.pdf",
    "uploaded_on": "2025-10-07T12:00:00Z",
    "signed": false,
    "file_url": "https://monday.com/file.pdf",
    "file_size": 245678,
    "mime_type": "application/pdf",
    "document_category": "Financial",
    "has_file_data": false
  }
]
```

### Upload Document
```http
POST /api/employees/:id/documents
Content-Type: application/json

{
  "doc_type": "Passport",
  "file_name": "passport.pdf",
  "file_data_base64": "JVBERi0xLjQKJ...",
  "mime_type": "application/pdf",
  "document_category": "Personal",
  "notes": "Valid until 2030",
  "signed": true
}
```

### Download Document
```http
GET /api/employees/:id/documents/:docId/download
```

**Response** (if file_data exists):
- Binary file download with proper Content-Type headers

**Response** (if only URL exists):
```json
{
  "message": "Document is stored externally",
  "url": "https://monday.com/file.pdf",
  "file_name": "contract.pdf"
}
```

### Delete Document
```http
DELETE /api/employees/:id/documents/:docId
```

**Response**: `204 No Content`

## Support

For questions or issues:
1. Check this documentation first
2. Review console logs for error details
3. Query database directly to verify data
4. Check Render logs for backend errors

## Summary

This onboarding import system streamlines the process of moving employee data from external forms into your HR system, while maintaining document links and providing a beautiful UI for managing employee documents going forward. The system is designed to be safe, repeatable, and extensible for future needs.

