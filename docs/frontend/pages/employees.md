# Employees Page

> **Source**: `web/src/pages/Employees.jsx`

Employee list, search, and management interface.

## Overview

The Employees page provides:
- Employee list with search and filtering
- Quick access to employee profiles
- Onboarding new employees
- Offboarding/termination workflow

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | Not accessible (redirected) |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/employees | List active employees |
| GET /api/employees/terminated | List terminated employees |
| GET /api/employees/departments | List departments |
| GET /api/employees/locations | List locations |
| POST /api/employees | Create employee (via onboarding) |
| DELETE /api/employees/:id | Terminate employee |

## UI Sections

### Header

- Page title
- Add Employee button (opens onboarding)
- Filter toggle (Active/Terminated)

### Search Bar

Full-text search across:
- First name, last name
- Email
- Phone
- Role title
- Department
- Location
- Status

### Employee Table

Columns:
- Name (first + last)
- Email
- Department
- Location
- Role Title
- Status
- Hire Date
- Actions

### Actions

Per-employee actions:
- View Profile → Opens EmployeeProfile
- Terminate → Opens offboarding (Manager+ only)

## Components Used

- `EmployeeOnboarding` - New employee wizard
- `EmployeeOffboarding` - Termination wizard
- `EmployeeProfile` - Profile view (embedded or modal)

## State

```jsx
const [employees, setEmployees] = useState([]);
const [departments, setDepartments] = useState([]);
const [locations, setLocations] = useState([]);
const [showOnboarding, setShowOnboarding] = useState(false);
const [showOffboarding, setShowOffboarding] = useState(false);
const [selectedEmployee, setSelectedEmployee] = useState(null);
const [employeeToTerminate, setEmployeeToTerminate] = useState(null);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState("");
const [filteredEmployees, setFilteredEmployees] = useState([]);
const [filterStatus, setFilterStatus] = useState("active");
```

## Filter Toggle

Switch between:
- **Active** - Non-terminated employees
- **Terminated** - Terminated employees

## Employee Profile

When an employee is selected, `EmployeeProfile` is shown with:
- Overview tab
- Financial tab
- HR Details tab
- Time Tracking tab
- Documents tab
- Training tab

## Onboarding Flow

1. Click "Add Employee"
2. `EmployeeOnboarding` wizard opens
3. Fill in employee details step by step
4. Submit creates employee
5. Redirects to new employee profile

## Offboarding Flow

1. Click terminate action on employee
2. `EmployeeOffboarding` wizard opens
3. Enter termination details
4. Submit updates employee status
5. Employee moves to "Terminated" list

## Responsive Design

- Desktop: Full table with all columns
- Tablet: Reduced columns, horizontal scroll
- Mobile: Card-based layout

## Related

- [Employees API](../../backend/routes/employees.md)
- [EmployeeProfile Page](./employee-profile.md)
- [Termination API](../../backend/routes/termination.md)

---

*Last verified: January 2026*
