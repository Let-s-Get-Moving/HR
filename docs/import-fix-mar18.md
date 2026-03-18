# Import Fix - March 18, 2026

## Issue

Deployment crashed with error:
```
SyntaxError: The requested module '../db.js' does not provide an export named 'default'
```

## Root Cause

In commit `624b486`, I rewrote `commissionRateCalculator.js` to load commission settings from the database. I used:

```javascript
import pool from '../db.js';  // WRONG - default import
```

But `db.js` exports `pool` as a **named export**, not default:

```javascript
export { pool };  // Named export
```

## Fix

Changed line 8 in `api/src/utils/commissionRateCalculator.js`:

```javascript
import { pool } from '../db.js';  // CORRECT - named import
```

## Files Changed

- `api/src/utils/commissionRateCalculator.js` (line 8)

## Status

- Fix applied (NOT COMMITTED per user request)
- No linter errors
- Ready to deploy
