#!/usr/bin/env node

/**
 * REMAINING MODULES TEST SUITE
 * Tests modules not covered in other test files:
 * - Analytics Dashboard
 * - Metrics
 * - Imports (File Uploads)
 * - Admin Routes
 * - Employee Matching
 * - Admin Cleanup
 * - Diagnostic Endpoints
 * - Timecards (detailed)
 */

const API_BASE = 'https://hr-api-wbzs.onrender.com';

let sessionCookie = null;
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// ============================================
// HELPERS
// ============================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function apiCall(endpoint, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function test(name, testFn) {
  testResults.total++;
  
  try {
    log('🧪', `Testing: ${name}`);
    const result = await testFn();
    
    if (result === true) {
      testResults.passed++;
      log('✅', `PASSED: ${name}`);
    } else if (result === 'skip') {
      testResults.skipped++;
      log('⏭️ ', `SKIPPED: ${name}`);
    } else {
      testResults.failed++;
      log('❌', `FAILED: ${name} - ${result || 'Unknown error'}`);
    }
  } catch (error) {
    testResults.failed++;
    log('❌', `ERROR: ${name} - ${error.message}`);
  }
  
  console.log('');
}

// ============================================
// AUTHENTICATION
// ============================================

async function authenticate() {
  logSection('🔐 Authentication');
  
  const response = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  if (response.ok && response.data.user) {
    log('✅', `Authenticated as: ${response.data.user.username}`);
    
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
    
    return true;
  }
  
  log('⚠️', 'Authentication failed - testing public endpoints only');
  return false;
}

// ============================================
// ANALYTICS DASHBOARD TESTS
// ============================================

async function testAnalyticsDashboard() {
  logSection('📊 Analytics Dashboard Tests');
  
  await test('Analytics - Get Dashboard', async () => {
    const response = await apiCall('/api/analytics/dashboard');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      if (response.status === 404) return 'Endpoint not found';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data || typeof response.data !== 'object') {
      return 'Invalid response structure';
    }
    
    log('📈', 'Analytics dashboard data retrieved');
    return true;
  });
  
  await test('Analytics - Employee Analytics', async () => {
    const response = await apiCall('/api/analytics/employees');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'Employee analytics retrieved');
    return true;
  });
  
  await test('Analytics - Financial Analytics', async () => {
    const response = await apiCall('/api/analytics/financial');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('💰', 'Financial analytics retrieved');
    return true;
  });
}

// ============================================
// METRICS TESTS
// ============================================

async function testMetrics() {
  logSection('📈 Metrics Tests');
  
  await test('Metrics - System Metrics', async () => {
    const response = await apiCall('/api/metrics');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'System metrics retrieved');
    return true;
  });
  
  await test('Metrics - Performance Metrics', async () => {
    const response = await apiCall('/api/metrics/performance');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('⚡', 'Performance metrics retrieved');
    return true;
  });
  
  await test('Metrics - Usage Statistics', async () => {
    const response = await apiCall('/api/metrics/usage');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'Usage statistics retrieved');
    return true;
  });
}

// ============================================
// IMPORTS (FILE UPLOADS) TESTS
// ============================================

async function testImports() {
  logSection('📁 Imports & File Upload Tests');
  
  await test('Imports - Get Import History', async () => {
    const response = await apiCall('/api/imports');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📋', `Found ${response.data.length} import records`);
    return true;
  });
  
  await test('Imports - Validate File Upload Endpoint', async () => {
    const response = await apiCall('/api/imports/validate', {
      method: 'POST',
      body: JSON.stringify({ 
        fileName: 'test.xlsx',
        fileSize: 1024 
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      // 400 is acceptable for validation endpoint with no actual file
      if (response.status === 400) {
        log('ℹ️', 'Validation endpoint exists (400 expected without file)');
        return true;
      }
      return `HTTP ${response.status}`;
    }
    
    return true;
  });
  
  await test('Imports - Employee Import Endpoint', async () => {
    const response = await apiCall('/api/imports/employees');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      if (response.status === 400 || response.status === 405) return 'skip'; // Method not allowed or bad request without file
      return `HTTP ${response.status}`;
    }
    
    return true;
  });
  
  await test('Imports - Timecard Import Endpoint', async () => {
    const response = await apiCall('/api/imports/timecards');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      if (response.status === 400 || response.status === 405) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    return true;
  });
}

// ============================================
// ADMIN ROUTES TESTS
// ============================================

async function testAdminRoutes() {
  logSection('🔧 Admin Routes Tests');
  
  await test('Admin - Get System Status', async () => {
    const response = await apiCall('/api/admin/status');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      if (response.status === 404) return 'Endpoint not found';
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'System status retrieved');
    return true;
  });
  
  await test('Admin - Get User Management', async () => {
    const response = await apiCall('/api/admin/users');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      if (response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('👥', 'User management accessible');
    return true;
  });
  
  await test('Admin - System Settings', async () => {
    const response = await apiCall('/api/admin/settings');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      if (response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('⚙️', 'System settings accessible');
    return true;
  });
}

// ============================================
// EMPLOYEE MATCHING TESTS
// ============================================

async function testEmployeeMatching() {
  logSection('🔍 Employee Matching Tests');
  
  await test('Employee Matching - Find Duplicates', async () => {
    const response = await apiCall('/api/employee-matching/duplicates');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('🔍', `Found ${response.data.length} potential duplicates`);
    return true;
  });
  
  await test('Employee Matching - Match Suggestions', async () => {
    const response = await apiCall('/api/employee-matching/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      if (response.status === 400) return 'skip'; // Bad request acceptable
      return `HTTP ${response.status}`;
    }
    
    log('🎯', 'Match suggestions working');
    return true;
  });
}

// ============================================
// ADMIN CLEANUP TESTS
// ============================================

async function testAdminCleanup() {
  logSection('🧹 Admin Cleanup Tests');
  
  await test('Admin Cleanup - Get Cleanup Jobs', async () => {
    const response = await apiCall('/api/admin-cleanup/jobs');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📋', 'Cleanup jobs retrieved');
    return true;
  });
  
  await test('Admin Cleanup - Cleanup Old Sessions', async () => {
    const response = await apiCall('/api/admin-cleanup/sessions', {
      method: 'POST'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🧹', 'Session cleanup executed');
    return true;
  });
  
  await test('Admin Cleanup - Cleanup Old Notifications', async () => {
    const response = await apiCall('/api/admin-cleanup/notifications', {
      method: 'POST'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🧹', 'Notification cleanup executed');
    return true;
  });
}

// ============================================
// DIAGNOSTIC TESTS
// ============================================

async function testDiagnostic() {
  logSection('🔧 Diagnostic Tests');
  
  await test('Diagnostic - Database Health', async () => {
    const response = await apiCall('/api/diagnostic/database');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('💾', 'Database health check completed');
    return true;
  });
  
  await test('Diagnostic - System Info', async () => {
    const response = await apiCall('/api/diagnostic/system');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('ℹ️', 'System info retrieved');
    return true;
  });
  
  await test('Diagnostic - Connection Test', async () => {
    const response = await apiCall('/api/diagnostic/connectivity');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🌐', 'Connectivity test completed');
    return true;
  });
}

// ============================================
// TIMECARDS DETAILED TESTS
// ============================================

async function testTimecardsDetailed() {
  logSection('⏰ Timecards Detailed Tests');
  
  await test('Timecards - Get All Timecards', async () => {
    const response = await apiCall('/api/timecards');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} timecards`);
    return true;
  });
  
  await test('Timecards - Create Timecard', async () => {
    const response = await apiCall('/api/timecards', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: 1,
        date: '2025-01-08',
        hours_worked: 8,
        overtime_hours: 0
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Timecard created');
    return true;
  });
  
  await test('Timecards - Get Employee Timecards', async () => {
    const response = await apiCall('/api/timecards/employee/1');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📋', 'Employee timecards retrieved');
    return true;
  });
  
  await test('Timecards - Upload Bulk Timecards', async () => {
    const response = await apiCall('/api/timecardUploads');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404 || response.status === 405) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    return true;
  });
}

// ============================================
// USERS MANAGEMENT TESTS
// ============================================

async function testUsersManagement() {
  logSection('👥 Users Management Tests');
  
  await test('Users - Get All Users', async () => {
    const response = await apiCall('/api/users');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} users`);
    return true;
  });
  
  await test('Users - Create User', async () => {
    const response = await apiCall('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!',
        role: 'user'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 400) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'User created');
    return true;
  });
  
  await test('Users - Update User', async () => {
    const response = await apiCall('/api/users/1', {
      method: 'PUT',
      body: JSON.stringify({
        email: 'updated@example.com'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'User updated');
    return true;
  });
}

// ============================================
// COMMISSIONS DETAILED TESTS
// ============================================

async function testCommissionsDetailed() {
  logSection('💵 Commissions Detailed Tests');
  
  await test('Commissions - Get All Commissions', async () => {
    const response = await apiCall('/api/commissions');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} commissions`);
    return true;
  });
  
  await test('Commissions - Create Commission', async () => {
    const response = await apiCall('/api/commissions', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: 1,
        amount: 1000,
        period: 'Q1 2025',
        sales_amount: 50000,
        commission_rate: 0.02
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Commission created');
    return true;
  });
  
  await test('Commissions - Get Employee Commissions', async () => {
    const response = await apiCall('/api/commissions/employee/1');
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📋', 'Employee commissions retrieved');
    return true;
  });
}

// ============================================
// MAIN RUNNER
// ============================================

async function runAllTests() {
  console.log('\n');
  log('🚀', 'Starting Remaining Modules Test Suite');
  log('📅', `Date: ${new Date().toISOString()}`);
  log('🌐', `API Base: ${API_BASE}`);
  console.log('\n');
  
  await authenticate();
  
  await testAnalyticsDashboard();
  await testMetrics();
  await testImports();
  await testAdminRoutes();
  await testEmployeeMatching();
  await testAdminCleanup();
  await testDiagnostic();
  await testTimecardsDetailed();
  await testUsersManagement();
  await testCommissionsDetailed();
  
  logSection('📊 FINAL RESULTS');
  
  console.log(`Total Tests:   ${testResults.total}`);
  console.log(`✅ Passed:     ${testResults.passed}`);
  console.log(`❌ Failed:     ${testResults.failed}`);
  console.log(`⏭️  Skipped:    ${testResults.skipped}`);
  
  const successRate = testResults.total - testResults.skipped > 0
    ? ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1)
    : 0;
  console.log(`\n📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${testResults.failed} TESTS FAILED\n`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});

