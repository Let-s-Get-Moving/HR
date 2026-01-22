# Employee Matching

> **Source**: `api/src/utils/employeeMatching.js`

Utilities for matching employee names across data sources.

## Purpose

Match employee names from external data (Excel files, commission reports) to database employee records. Handles:
- First name / last name variations
- Nicknames
- Case differences
- Partial matches

## Exports

| Function | Purpose |
|----------|---------|
| `findEmployeeByName` | Find employee by name string |
| `normalizeNameForMatching` | Normalize name for comparison |
| `getMatchScore` | Calculate match score |

## findEmployeeByName(name, employees)

Find the best matching employee:

```javascript
const employees = await getEmployees();
const match = findEmployeeByName('John Doe', employees);

// Returns:
{
  employee: { id: 123, first_name: 'John', ... },
  score: 1.0,
  matchType: 'exact'
}

// Or null if no good match
```

## Match Types

| Type | Description | Score |
|------|-------------|-------|
| `exact` | Exact first + last name match | 1.0 |
| `nickname` | Matches nickname field | 0.95 |
| `fuzzy` | Close enough match | 0.8-0.9 |
| `partial` | Partial name match | 0.5-0.7 |

## Nickname Support

Employees can have up to 3 nicknames:
- `nickname` - Primary nickname
- `nickname_2` - Secondary nickname
- `nickname_3` - Tertiary nickname

Example: Employee "Robert Smith" with nickname "Bob" matches:
- "Robert Smith" (exact)
- "Bob Smith" (nickname)
- "BOB SMITH" (case-insensitive)

## normalizeNameForMatching(name)

Normalize name for comparison:

```javascript
normalizeNameForMatching('  John   DOE  ')
// Returns: 'john doe'
```

Operations:
- Trim whitespace
- Lowercase
- Remove extra spaces
- Remove special characters

## Usage in Import

```javascript
import { findEmployeeByName } from '../utils/employeeMatching.js';

// During commission import
for (const row of commissionData) {
  const match = findEmployeeByName(row.agent_name, employees);
  
  if (match && match.score >= 0.8) {
    // Use match.employee.id
  } else {
    // Log unmatched name
  }
}
```

---

*Last verified: January 2026*
