# Testing Guide

> **Source**: `tests/`, `api/src/tests/`, `web/src/**/__tests__/`

This document covers the test strategy and how to run tests.

## Test Locations

| Location | Type | Framework |
|----------|------|-----------|
| `tests/` | Integration tests | Node.js scripts |
| `api/src/tests/` | API unit tests | Vitest |
| `web/src/**/__tests__/` | Frontend tests | Vitest + Testing Library |

## Running Tests

### All Integration Tests

```bash
cd tests
node comprehensive-test.js
```

### API Tests

```bash
cd api
npm test
```

### Frontend Tests

```bash
cd web
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
npm run test:ui       # UI mode
```

## Test Categories

### Integration Tests (`tests/`)

End-to-end tests that hit the running API.

| Test File | What It Tests |
|-----------|---------------|
| comprehensive-test.js | Full system test suite |
| real-api-test.js | API endpoints against real DB |
| test-payroll-system.js | Payroll functionality |
| test-leave-management.js | Leave requests and balances |
| test-compliance-management.js | Compliance alerts |
| test-file-validation.js | File upload validation |
| test-mfa-complete-flow.js | MFA setup and verification |

### API Unit Tests (`api/src/tests/`)

Unit tests for backend modules.

| Test File | What It Tests |
|-----------|---------------|
| security.test.js | Security middleware |
| integration.test.js | Route integration |
| workdayCalculator.test.js | Business day calculations |
| bookedOpportunitiesImporter.test.js | Import logic |

### Frontend Tests (`web/src/**/__tests__/`)

React component and utility tests.

| Test File | What It Tests |
|-----------|---------------|
| Button.test.tsx | Button component |
| FormInput.test.tsx | Form input component |
| apiClient.test.ts | API client utility |
| timezone.test.js | Timezone utilities |

## Writing Tests

### Integration Test Example

```javascript
// tests/test-new-feature.js
const API_URL = process.env.API_URL || 'http://localhost:8080';

async function testNewFeature() {
  console.log('Testing new feature...');
  
  // Login first
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Avneet', password: 'password123' })
  });
  
  const cookies = loginRes.headers.get('set-cookie');
  
  // Test the feature
  const res = await fetch(`${API_URL}/api/new-feature`, {
    headers: { Cookie: cookies }
  });
  
  if (!res.ok) {
    throw new Error(`Failed: ${res.status}`);
  }
  
  const data = await res.json();
  console.log('Response:', data);
  
  // Assertions
  if (!data.expected_field) {
    throw new Error('Missing expected_field');
  }
  
  console.log('✅ New feature test passed');
}

testNewFeature().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
```

### API Unit Test Example

```javascript
// api/src/tests/myModule.test.js
import { describe, it, expect } from 'vitest';
import { myFunction } from '../utils/myModule.js';

describe('myModule', () => {
  describe('myFunction', () => {
    it('should return expected result', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });
    
    it('should handle edge cases', () => {
      expect(myFunction(null)).toBeNull();
      expect(myFunction('')).toBe('');
    });
  });
});
```

### Frontend Test Example

```typescript
// web/src/components/__tests__/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  it('handles click', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Test Configuration

### API (api/vitest.config.js)

```javascript
export default {
  test: {
    environment: 'node',
    globals: true
  }
};
```

### Frontend (web/vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true
  }
});
```

## Test Database

Integration tests run against a real database. Options:

### Use Docker database

```bash
# Start database
docker compose -f config/docker-compose.yml up -d db

# Run tests
cd tests
DATABASE_URL=postgresql://hr:hrpass@localhost:5432/hrcore node test-file.js
```

### Use separate test database

```bash
# Create test database
createdb hrcore_test
psql -d hrcore_test -f db/init/001_schema.sql
# ... run migrations

# Run tests
DATABASE_URL=postgresql://hr:hrpass@localhost:5432/hrcore_test npm test
```

## CI/CD Testing

Tests can be run in CI pipelines:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: hr
          POSTGRES_PASSWORD: hrpass
          POSTGRES_DB: hrcore
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install API deps
        run: cd api && npm ci
      
      - name: Run API tests
        run: cd api && npm test
        env:
          DATABASE_URL: postgresql://hr:hrpass@localhost:5432/hrcore
      
      - name: Install Web deps
        run: cd web && npm ci
      
      - name: Run Web tests
        run: cd web && npm run test:run
```

## Coverage

### Frontend Coverage

```bash
cd web
npm run test:coverage
```

Coverage report generated in `web/coverage/`.

### API Coverage

```bash
cd api
npm run test -- --coverage
```

## Troubleshooting

### Tests hang

- Check database is running
- Check for unclosed connections
- Add timeout to tests

### Database state issues

- Reset database between test runs
- Use transactions and rollback
- Clean up test data after tests

### Frontend tests fail

- Check component renders without errors
- Verify mocks are set up correctly
- Check for missing providers (Router, Context, etc.)

---

*Last verified: January 2026*
