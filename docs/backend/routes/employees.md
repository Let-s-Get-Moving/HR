# Employees API

> **Source**: `api/src/routes/employees.js`

Employee management endpoints for CRUD operations, profiles, documents, and related data.

## Endpoints

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/employees | List all active employees | Required | All (scoped) |
| GET | /api/employees/terminated | List terminated employees | Required | Manager+ |
| GET | /api/employees/:id | Get employee details | Required | All (scoped) |
| POST | /api/employees | Create employee | Required | All |
| PUT | /api/employees/:id | Update employee | Required | All (scoped) |
| DELETE | /api/employees/:id | Terminate employee | Required | Manager+ |
| GET | /api/employees/departments | List departments | Required | All |
| POST | /api/employees/departments | Create department | Required | Manager+ |
| DELETE | /api/employees/departments/:id | Delete department | Required | Manager+ |
| GET | /api/employees/locations | List locations | Required | All |
| POST | /api/employees/locations | Create location | Required | Manager+ |
| PUT | /api/employees/locations/:id | Update location | Required | Manager+ |
| DELETE | /api/employees/locations/:id | Delete location | Required | Manager+ |
| GET | /api/employees/:id/documents | Get employee documents | Required | All |
| POST | /api/employees/:id/documents | Upload document | Required | All |
| GET | /api/employees/:id/documents/:docId/download | Download document | Required | All |
| DELETE | /api/employees/:id/documents/:docId | Delete document | Required | All |
| GET | /api/employees/:id/time-entries | Get time entries | Required | All |
| GET | /api/employees/:id/training-records | Get training records | Required | All |
| GET | /api/employees/:id/payroll-history | Get payroll history | Required | All |
| GET | /api/employees/:id/hr-details | Get HR details | Required | All |

## RBAC Scope

- **Admin/Manager**: See all employees
- **User**: See only their own employee record

## GET /api/employees

List all active (non-terminated) employees.

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe",
    "email": "john@example.com",
    "work_email": "john@company.com",
    "phone": "555-1234",
    "status": "Active",
    "department": "Operations",
    "location": "Toronto",
    "hourly_rate": 25.00,
    "hire_date": "2024-01-15"
  }
]
```

## POST /api/employees

Create a new employee.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "work_email": "john@company.com",
  "hire_date": "2024-01-15",
  "employment_type": "Full-time",
  "department_id": 1,
  "location_id": 1,
  "hourly_rate": 25.00,
  "role_title": "Developer",
  "nickname": "Johnny"
}
```

**Validation (Zod schema):**
- `first_name`: string, required
- `last_name`: string, required
- `work_email`: valid email, required
- `hire_date`: YYYY-MM-DD, required
- `employment_type`: "Full-time" | "Part-time" | "Contract", required
- `department_id`: integer, optional
- `location_id`: integer, optional
- `hourly_rate`: number >= 0, optional (default: 25)
- `nickname`, `nickname_2`, `nickname_3`: strings, optional (for name matching)

**Response:**
```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

**Errors:**
- `400`: Validation failed
- `409`: Nickname conflict (nickname already used by another employee)

## PUT /api/employees/:id

Update an employee.

**Request:** Same fields as POST (all optional, merged with existing data)

**Notes:**
- User role cannot update `hourly_rate` or `department_id`
- Nickname conflicts return 409 error

## DELETE /api/employees/:id

Soft-delete (terminate) an employee.

**Effect:**
- Sets `status` to "Terminated"
- Sets `termination_date` to current date
- Sets `termination_reason` to "Terminated via HR system"

## Documents

### POST /api/employees/:id/documents

Upload a document.

**Request:**
```json
{
  "doc_type": "Contract",
  "file_name": "contract.pdf",
  "file_data_base64": "base64-encoded-content",
  "mime_type": "application/pdf",
  "document_category": "Contracts",
  "signed": true,
  "notes": "Signed on 2024-01-15"
}
```

### GET /api/employees/:id/documents/:docId/download

Download a document file.

**Response:** File binary with appropriate Content-Type, or JSON with external URL if stored externally.

## HR Details

### GET /api/employees/:id/hr-details

Get comprehensive HR data for an employee.

**Response:**
```json
{
  "addresses": [...],
  "emergency_contacts": [...],
  "bank_accounts": [...],
  "identifiers": [...],
  "compensation_history": [...],
  "status_history": [...]
}
```

## Database Tables

- `employees` - Main employee data
- `departments` - Department definitions
- `locations` - Location definitions
- `documents` - Employee documents
- `training_records` - Training completions
- `employee_addresses` - Address history
- `employee_emergency_contacts` - Emergency contacts
- `employee_bank_accounts` - Bank account info
- `employee_identifiers` - SIN, work permits, etc.
- `employee_compensation` - Compensation history
- `employee_status_history` - Status changes

## Examples

```bash
# List employees
curl -X GET http://localhost:8080/api/employees \
  -H "Cookie: session_id=..."

# Create employee
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "work_email": "jane@company.com",
    "hire_date": "2024-01-15",
    "employment_type": "Full-time"
  }'

# Update employee
curl -X PUT http://localhost:8080/api/employees/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"hourly_rate": 30.00}'
```

---

*Last verified: January 2026*
