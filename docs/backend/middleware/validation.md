# Validation Middleware

> **Source**: `api/src/middleware/validation.js`

Request validation using Zod schemas.

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `createValidationMiddleware` | Factory | Create validation middleware |
| `validateRequest` | Middleware | Generic validation |

## createValidationMiddleware(schema)

Factory that creates validation middleware from Zod schema:

```javascript
import { z } from 'zod';
import { createValidationMiddleware } from '../middleware/validation.js';

const employeeSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

router.post('/',
  createValidationMiddleware(employeeSchema),
  async (req, res) => {
    // req.validatedData contains validated data
    const data = req.validatedData;
  }
);
```

## Validation Response

On validation failure, returns 400 with details:

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "First name is required; Email must be valid",
  "details": [
    { "field": "first_name", "message": "Required" },
    { "field": "email", "message": "Invalid email" }
  ]
}
```

## Common Schemas

Located in `api/src/schemas/enhancedSchemas.js`:

```javascript
export const enhancedLeaveRequestSchema = z.object({
  leave_type: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional()
});
```

## Date Validation Pattern

For date fields, use YYYY-MM-DD format:

```javascript
const dateRequired = z.string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const dateOptional = z.union([
  z.null(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
]).transform(val => val === '' ? null : val);
```

---

*Last verified: January 2026*
