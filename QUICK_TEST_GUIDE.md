# Quick Testing Guide

## Run All Tests (Recommended)

```bash
./run-all-tests.sh
```

This runs all major test suites in sequence and provides a comprehensive summary.

---

## Run Individual Test Suites

### New Features (Comprehensive)
Tests all newly added features: Chat, Notifications, Settings, Trusted Devices, WebSocket, etc.

```bash
node tests/test-new-features-comprehensive.js
```

**Coverage:** Chat system, Notifications, Settings, Trusted Devices, WebSocket, Recruiting, Benefits, Bonuses

---

### Integration Workflows
Tests complete end-to-end business workflows.

```bash
node tests/test-integration-workflows.js
```

**Coverage:** 8 complete workflows including onboarding, recruiting, leave management, payroll, benefits, etc.

---

### API Endpoint Coverage
Validates all 80+ API endpoints systematically.

```bash
node tests/test-api-endpoint-coverage.js
```

**Coverage:** Complete API surface validation

---

### Core Functionality
Tests basic system functionality and data integrity.

```bash
node tests/test-all-functionality.js
```

**Coverage:** Health checks, CRUD operations, basic workflows

---

### Security & MFA
Tests authentication, MFA, and security features.

```bash
# All security features
node tests/test-all-security-features.js

# Complete MFA flow
node tests/test-mfa-complete-flow.js
```

---

## Quick Tests (by Feature)

### Chat System Only
```bash
# Run comprehensive test, it will show chat results
node tests/test-new-features-comprehensive.js | grep -A 20 "💬 Chat"
```

### Notifications Only
```bash
# Run comprehensive test, filter for notifications
node tests/test-new-features-comprehensive.js | grep -A 15 "🔔 Notifications"
```

### WebSocket Only
```bash
# Run comprehensive test, filter for WebSocket
node tests/test-new-features-comprehensive.js | grep -A 10 "🔌 WebSocket"
```

---

## Test Results

### Understanding Output

- ✅ **PASSED** - Test successful
- ⏭️ **SKIPPED** - Test skipped (no data, no auth, or N/A)
- ❌ **FAILED** - Test failed - needs attention
- 🎉 **ALL PASSED** - Complete success

### Common Skip Reasons

1. **Not Authenticated (401)** - Test requires login, but auth failed
2. **Insufficient Permissions (403)** - User doesn't have required permissions
3. **No Data Available** - Database doesn't have seed data for testing
4. **Feature Not Configured** - Optional feature not set up

### If Tests Fail

1. Check API server is running: `https://hr-api-wbzs.onrender.com/api/health/health`
2. Verify authentication works: Try logging in to the web app
3. Check database has seed data
4. Review error messages in test output
5. Check `tests/README.md` for troubleshooting

---

## Running Specific Test Categories

### All New Features
```bash
node tests/test-new-features-comprehensive.js
```

### All Workflows
```bash
node tests/test-integration-workflows.js
```

### All Endpoints
```bash
node tests/test-api-endpoint-coverage.js
```

### Specific Feature Tests
```bash
# Payroll
node tests/test-payroll-system.js

# Leave Management
node tests/test-leave-management.js

# Performance
node tests/test-performance-management.js

# Compliance
node tests/test-compliance-management.js
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: HR System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm install ws  # For WebSocket tests
      - run: ./run-all-tests.sh
```

---

## Development Workflow

### Before Committing
```bash
# Run core + new features
node tests/test-all-functionality.js
node tests/test-new-features-comprehensive.js
```

### Before Deploying
```bash
# Run full suite
./run-all-tests.sh
```

### After Adding a Feature
```bash
# Update test file
# Add tests to test-new-features-comprehensive.js or test-integration-workflows.js
# Run tests
node tests/test-new-features-comprehensive.js
```

---

## Performance Testing

### Check Response Times
```bash
# All tests include performance checks
# Look for response time warnings in output
node tests/test-all-functionality.js | grep "Response time"
```

### Stress Testing
```bash
# Run tests multiple times
for i in {1..5}; do
  echo "Run $i"
  node tests/test-new-features-comprehensive.js
done
```

---

## Need Help?

- **Full Documentation**: See `tests/README.md`
- **Testing Summary**: See `TESTING_SUMMARY.md`
- **API Documentation**: See main `README.md`

---

## Test Statistics

| Test Suite | Tests | Features | Duration |
|------------|-------|----------|----------|
| New Features Comprehensive | 30+ | 8 | ~2-3 min |
| Integration Workflows | 40+ steps | 8 workflows | ~3-4 min |
| API Endpoint Coverage | 80+ | All endpoints | ~4-5 min |
| Core Functionality | 20+ | Core features | ~1-2 min |
| Security & MFA | 15+ | Auth & security | ~1-2 min |
| **TOTAL** | **150+** | **All features** | **~10-15 min** |

---

**Last Updated:** December 8, 2024

