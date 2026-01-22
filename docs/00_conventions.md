# Documentation Conventions

This document defines the standards for all documentation in this repository.

## File Naming

- Use lowercase with hyphens: `payroll-v2.md`, `local-dev.md`
- Backend route docs match their source file: `api/src/routes/employees.js` → `docs/backend/routes/employees.md`
- Frontend page docs match their source file: `web/src/pages/Dashboard.jsx` → `docs/frontend/pages/dashboard.md`

## Document Template

Every documentation page should follow this structure:

```markdown
# [Module/Feature Name]

> **Source**: `path/to/source/file.js`

Brief one-paragraph description of what this module does.

## Overview

More detailed explanation if needed.

## [For Backend Routes] Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/resource | List all | Required |
| POST | /api/resource | Create new | Required |

## [For Frontend Pages] User Interface

Description of what the user sees and can do.

## API/Props

Document the public interface:
- For routes: request/response shapes
- For components: props
- For utils: function signatures

## Data Model

Tables and queries this module touches.

## Authentication & Authorization

- What auth is required?
- What roles can access?
- Any special permissions?

## Configuration

Environment variables, settings, or options.

## Error Handling

Expected error cases and how they're handled.

## Examples

```bash
# curl example for API
curl -X GET http://localhost:8080/api/resource
```

## Related

- Links to related docs

---

*Last verified: [date] against commit [hash]*
```

## When to Update Docs

Update documentation when you:

1. **Add a new endpoint** → Update the route doc + coverage.md
2. **Change request/response shape** → Update the route doc
3. **Add a new page** → Create page doc + update frontend README + coverage.md
4. **Change authentication** → Update security docs + affected route docs
5. **Add environment variables** → Update ops docs + affected module docs
6. **Add database tables/columns** → Update database docs

## Verification Footer

Every doc should end with a verification line:

```markdown
*Last verified: January 2026 against commit abc1234*
```

This helps identify stale docs. When you verify a doc is still accurate, update this line.

## Legacy Docs

When a doc is superseded:

1. **Don't delete it** - external links may reference it
2. Add a legacy header at the top:

```markdown
> **LEGACY DOCUMENT**
> This document is outdated. See [New Location](./path/to/new-doc.md) for current information.
```

3. Don't update the content - just leave it as-is with the redirect notice

## Writing Style

- Be direct and concise
- Use code blocks for commands, file paths, and code
- Use tables for structured data (endpoints, props, env vars)
- Include working examples where possible
- Avoid marketing language and superlatives
- Don't include credentials or secrets in docs

## Required Sections by Doc Type

### Backend Route Docs
- [ ] Endpoints table
- [ ] Request/response examples
- [ ] Auth requirements
- [ ] Database tables touched
- [ ] Error responses

### Frontend Page Docs
- [ ] What the page does (user perspective)
- [ ] API calls made
- [ ] Role/permission requirements
- [ ] Key components used

### Middleware/Utils Docs
- [ ] What it does
- [ ] Public functions/exports
- [ ] Usage example
- [ ] Where it's used

### Database Docs
- [ ] Table schema
- [ ] Key indexes
- [ ] Foreign key relationships
- [ ] Triggers/functions

---

*Last verified: January 2026*
