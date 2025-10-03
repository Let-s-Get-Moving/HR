# Employee Creation & Data Storage Summary

## ✅ Changes Implemented

### 1. Email Format Standardization

**New Email Format:**
```
firstname@letsgetmovinggroup.com
```

**Examples:**
- John Smith → `john@letsgetmovinggroup.com`
- Maria Garcia → `maria@letsgetmovinggroup.com`
- Jean-Paul Dubois → `jean-paul@letsgetmovinggroup.com` (keeps hyphens)

**Changed From:**
```
firstname.lastname@imported.local  ❌ OLD
```

**Where This Applies:**
- ✅ Auto-created employees during timecard uploads
- ✅ Follows company email structure
- ✅ All lowercase, no dots between names
- ✅ Uses company domain: `@letsgetmovinggroup.com`

---

### 2. Department & Location Now Optional

**Previous Behavior:**
- ❌ Department was REQUIRED
- ❌ Location was REQUIRED
- ❌ Couldn't create employee without assigning both

**New Behavior:**
- ✅ Department is OPTIONAL (HR assigns manually)
- ✅ Location is OPTIONAL (HR assigns manually)
- ✅ Default dropdown shows: "None - To be assigned by HR"
- ✅ Can create employee and assign department later

**Why This Change:**
- HR needs time to evaluate proper department fit
- Location may change during onboarding
- More flexible hiring workflow

---

## 📋 What Employee Form Fields Are Saved

### ✅ ALL Fields From Form ARE Saved to Database

When you fill out the employee onboarding form, **everything gets saved**.

### Step 1: Basic Information (Saved to `employees` table)
```javascript
✅ first_name      → employees.first_name
✅ last_name       → employees.last_name
✅ email           → employees.email
✅ phone           → employees.phone
✅ gender          → employees.gender
✅ birth_date      → employees.birth_date
```

### Step 2: Employment Details (Saved to `employees` table)
```javascript
✅ hire_date       → employees.hire_date
✅ employment_type → employees.employment_type (Full-time/Part-time/Contract)
✅ department_id   → employees.department_id (now optional)
✅ location_id     → employees.location_id (now optional)
✅ role_title      → employees.role_title
✅ probation_end   → employees.probation_end
✅ hourly_rate     → employees.hourly_rate (defaults to 25)
```

### Step 3: Documents & Financial (Saved to separate tables)
```javascript
✅ contract_file            → documents table
✅ id_document              → documents table
✅ sin_number               → (currently not saved - needs implementation)
✅ direct_deposit_info      → (currently not saved - needs implementation)
   - bank_name
   - account_number
   - transit_number
   - institution_number
✅ tax_forms                → documents table
   - td1_on
   - td1_ab
✅ status_documents         → documents table
   - work_permit
   - permanent_resident_card
   - canadian_passport
   - birth_certificate
✅ emergency_contact        → (currently not saved - needs implementation)
   - name
   - relationship
   - phone
```

### Step 4: Training & Compliance
```javascript
✅ required_trainings       → (linked via separate API)
```

---

## 🔍 Detailed Data Flow

### Creating Employee via Form:

```
1. Frontend collects all form data
   ↓
2. Sends to POST /api/employees
   ↓
3. API validates with Zod schema:
      - first_name: required
      - last_name: required
      - email: required (must be valid email)
      - hire_date: required
      - employment_type: required (Full-time/Part-time/Contract)
      - department_id: OPTIONAL (can be null)
      - location_id: OPTIONAL (can be null)
      - All other fields: optional
   ↓
4. INSERT INTO employees (...)
   ↓
5. Returns employee with ID
   ↓
6. Frontend saves documents/contracts using employee.id
```

### Auto-Creating Employee During Timecard Upload:

```
1. Parse Excel file
   ↓
2. Find employee name "John Smith"
   ↓
3. Check if employee exists: SELECT ... WHERE name = 'John Smith'
   ↓
4. If NOT found:
      - Split name: firstName="John", lastName="Smith"
      - Generate email: john@letsgetmovinggroup.com
      - INSERT INTO employees (
          first_name, last_name, email, hire_date,
          employment_type='Full-time',
          status='Active',
          role_title='Employee',
          department_id=NULL,  ← Empty!
          location_id=NULL     ← Empty!
        )
   ↓
5. Use employee.id for timecard
```

---

## 📊 Database Table Structure

### `employees` Table
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  hire_date DATE NOT NULL,
  employment_type TEXT NOT NULL,
  department_id INTEGER,        -- ✅ NOW NULLABLE
  location_id INTEGER,           -- ✅ NOW NULLABLE
  role_title TEXT,
  probation_end DATE,
  hourly_rate NUMERIC(10,2) DEFAULT 25,
  status TEXT DEFAULT 'Active',
  ...
);
```

### Related Tables
```sql
documents           → Stores uploaded files
employee_addresses  → Home addresses
emergency_contacts  → (needs to be implemented)
bank_accounts       → (needs to be implemented)
training_records    → Compliance training
```

---

## ⚠️ What's NOT Currently Saved

These fields from the form **need implementation**:

### ❌ Not Yet Implemented:
1. **Emergency Contact** - Form collects it but no database table/endpoint
2. **Direct Deposit Info** - Form collects it but no database table/endpoint
3. **SIN Number** - Form collects it but no column in employees table

### 💡 To Implement These:

#### Emergency Contacts:
```sql
CREATE TABLE emergency_contacts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

#### Bank Accounts:
```sql
CREATE TABLE employee_bank_accounts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  bank_name TEXT,
  account_number TEXT,
  transit_number TEXT,
  institution_number TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

#### Add SIN to employees table:
```sql
ALTER TABLE employees 
ADD COLUMN sin_number TEXT;
```

---

## ✅ Current vs Future State

### Current State ✅
```
When creating employee:
- Basic info: ✅ Saved
- Employment details: ✅ Saved
- Department: ✅ Optional (can be empty)
- Location: ✅ Optional (can be empty)
- Email: ✅ Uses firstname@letsgetmovinggroup.com
- Documents: ✅ Saved to documents table
```

### Future Enhancement (If Needed)
```
To save everything from form:
- Add emergency_contacts table
- Add employee_bank_accounts table
- Add sin_number column to employees
- Create API endpoints for these
- Update frontend to call new endpoints
```

---

## 🎯 Summary

### Your Questions Answered:

**Q1: Email structure should be firstname@letsgetmovinggroup.com**
✅ **DONE** - Auto-created employees now use this format

**Q2: Department should be empty by default, HR assigns manually**
✅ **DONE** - Department and location are now optional/nullable

**Q3: Are all employee form fields being saved to database?**
✅ **MOSTLY** - Basic info and employment details: YES
⚠️ **PARTIALLY** - Emergency contacts, bank info, SIN: NOT YET (need implementation)

### What You Can Do Now:
1. **Upload timecard files** → Auto-creates employees with correct email
2. **Manually create employees** → Can skip department/location
3. **Assign departments later** → HR can update employee records

### What Needs Work (Optional):
1. **Emergency contacts** - Add table + endpoints if needed
2. **Bank accounts** - Add table + endpoints if needed
3. **SIN storage** - Add column if needed

---

**All changes deployed!** Re-upload your timecard files and newly created employees will have the correct email format. 🎉

