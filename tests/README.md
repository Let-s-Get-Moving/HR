# HR System Test Suite

Comprehensive testing suite for the HR Management System covering all features and workflows.

## Test Files Overview

### Comprehensive Feature Tests

#### `test-new-features-comprehensive.js` ⭐ **NEW**
Tests all newly added features with full coverage:
- ✅ Chat System (threads, messages, attachments, WebSocket)
- ✅ Notifications (CRUD, WebSocket real-time updates, unread counts)
- ✅ Settings (notification preferences, user-specific settings)
- ✅ Trusted Devices (management, revocation, labeling)
- ✅ WebSocket (connections, real-time updates, ping/pong)
- ✅ Recruiting (comprehensive coverage)
- ✅ Benefits (comprehensive coverage)
- ✅ Bonuses (approval/rejection workflows)

**Run:** `node tests/test-new-features-comprehensive.js`

#### `test-integration-workflows.js` ⭐ **NEW**
End-to-end integration tests covering complete workflows:
1. Employee Onboarding Flow
2. Recruiting Pipeline (Job Posting → Candidate → Interview → Hire)
3. Leave Request & Approval Workflow
4. Payroll Processing Workflow
5. Benefits Enrollment Workflow
6. Performance Review Cycle
7. Chat & Notification Integration
8. Employee Termination Process

**Run:** `node tests/test-integration-workflows.js`

### Existing Test Files

#### `test-all-functionality.js`
Basic functionality tests covering core features:
- API health checks
- Leave management
- Performance management
- Compliance management
- Payroll system
- Employee management
- Error handling
- Performance benchmarks

**Run:** `node tests/test-all-functionality.js`

#### `comprehensive-test.js`
Original comprehensive test covering basic CRUD operations and data integrity.

**Run:** `node tests/comprehensive-test.js`

#### `test-specific-features.js`
Feature-specific tests including:
- Termination functionality
- Bonuses & commissions
- Recruiting API
- Benefits management
- Payroll operations

**Run:** `node tests/test-specific-features.js`

### Security & Authentication Tests

#### `test-mfa-complete-flow.js`
Complete MFA (Multi-Factor Authentication) flow testing:
- MFA setup and verification
- TOTP generation
- Trusted devices
- Login with MFA

**Run:** `node tests/test-mfa-complete-flow.js`

#### `test-all-security-features.js`
Security features testing:
- Authentication flows
- Session management
- Access control
- Security policies

**Run:** `node tests/test-all-security-features.js`

#### `security-audit-professional.js`
Professional security audit tests:
- Vulnerability scanning
- Security best practices
- Compliance checks

**Run:** `node tests/security-audit-professional.js`

### Specialized Tests

#### `test-payroll-system.js`
Comprehensive payroll system testing:
- Payroll calculations
- Commission structures
- Bonus structures
- Tax calculations

#### `test-leave-management.js`
Leave management system tests:
- Leave request creation
- Approval workflows
- Leave balances
- Analytics

#### `test-compliance-management.js`
Compliance system tests:
- Compliance alerts
- Training tracking
- Audit logs

#### `test-performance-management.js`
Performance management tests:
- Goals creation
- Reviews
- Analytics

### Frontend Tests

#### `test-frontend-functionality.js`
Frontend component and UI testing.

#### `test-popup-functionality-complete.js`
Popup and modal functionality tests.

### File Validation Tests

Multiple file validation test files for testing document uploads and file handling:
- `test-file-validation.js`
- `test-file-validation-direct.js`
- `test-file-validation-simple.js`
- `test-file-validation-with-auth.js`
- `test-file-validation-working.js`

## Running Tests

### Run Individual Test
```bash
node tests/[test-file-name].js
```

### Run All New Feature Tests
```bash
node tests/test-new-features-comprehensive.js
```

### Run Integration Workflows
```bash
node tests/test-integration-workflows.js
```

### Run Full Test Suite (Sequential)
```bash
# Core functionality
node tests/test-all-functionality.js

# New features
node tests/test-new-features-comprehensive.js

# Integration workflows
node tests/test-integration-workflows.js

# Security
node tests/test-all-security-features.js

# MFA
node tests/test-mfa-complete-flow.js
```

## Test Requirements

### Environment
- Node.js 18+ (for native fetch support)
- Network access to the API (https://hr-api-wbzs.onrender.com)
- For WebSocket tests: `ws` package (for Node.js WebSocket client)

### Install WebSocket Support (if needed)
```bash
npm install ws
```

### Authentication
Most tests require authentication. Default credentials:
- Username: `admin`
- Password: `admin123`

Some tests can run without authentication (public endpoints only).

## Test Coverage

### ✅ Fully Tested Features
- Authentication & MFA
- Employee Management
- Leave Management
- Performance Management
- Compliance Management
- Payroll System
- Chat System
- Notifications
- Settings
- Trusted Devices
- Recruiting
- Benefits
- Bonuses & Commissions
- Termination
- WebSocket Real-time Updates

### 📊 Test Statistics
- **Total Test Files**: 40+
- **New Feature Coverage**: 8 major features
- **Integration Workflows**: 8 end-to-end scenarios
- **Security Tests**: Multiple layers
- **Performance Tests**: Response time benchmarks

## Test Results Interpretation

### Success Indicators
- ✅ **PASSED**: Test completed successfully
- ⏭️ **SKIPPED**: Test skipped (no data, not authenticated, or N/A)
- ❌ **FAILED**: Test failed - requires attention
- 🎉 **ALL TESTS PASSED**: Complete success

### Common Skip Reasons
- Not authenticated (401)
- Insufficient permissions (403)
- No data available for testing
- Optional features not configured

### Handling Failures
1. Check authentication status
2. Verify database has required seed data
3. Check API server status
4. Review error messages in test output
5. Ensure all migrations have run

## CI/CD Integration

### GitHub Actions (Example)
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
      - run: node tests/test-all-functionality.js
      - run: node tests/test-new-features-comprehensive.js
      - run: node tests/test-integration-workflows.js
```

## Contributing

When adding new features:
1. Add unit tests to `test-new-features-comprehensive.js`
2. Add integration tests to `test-integration-workflows.js`
3. Update this README
4. Run all tests before committing

## Troubleshooting

### Test Fails with "Connection Refused"
- Ensure API server is running
- Check API_BASE URL in test files
- Verify network connectivity

### WebSocket Tests Fail
- Install `ws` package: `npm install ws`
- Check WebSocket server is running
- Verify session authentication

### Authentication Fails
- Check credentials are correct
- Verify user exists in database
- Check session management is working

### Tests Skip Everything
- Check if authenticated successfully
- Verify database has seed data
- Check user has required permissions

## Best Practices

1. **Run tests frequently**: Before and after changes
2. **Keep tests independent**: Each test should be self-contained
3. **Clean up test data**: Remove or flag test data appropriately
4. **Monitor performance**: Track response times
5. **Update tests**: When features change, update tests immediately

## Questions?

Check the main project README or contact the development team.

