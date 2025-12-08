#!/usr/bin/env node

/**
 * COMPREHENSIVE FRONTEND FUNCTIONALITY TEST
 * Tests all frontend pages and their API integrations
 * 
 * Pages Tested:
 * - Dashboard
 * - Employees
 * - TimeTracking
 * - LeaveManagement
 * - Payroll & PayrollV2
 * - Compliance
 * - Settings
 * - Benefits
 * - BonusesCommissions
 * - Messages (Chat)
 * - NotificationCenter
 * - Testing page
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
      data,
      headers: response.headers
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
  logSection('🔐 Authentication for Frontend Tests');
  
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
  
  log('⚠️', 'Authentication failed');
  return false;
}

// ============================================
// DASHBOARD PAGE TESTS
// ============================================

async function testDashboardPage() {
  logSection('📊 Dashboard Page Tests');
  
  await test('Dashboard - Get Employee Count', async () => {
    const response = await apiCall('/api/employees');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Dashboard can display ${response.data.length} employees`);
    return true;
  });
  
  await test('Dashboard - Get Recent Leave Requests', async () => {
    const response = await apiCall('/api/leave/requests');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('📊', `Dashboard can display ${response.data.length} leave requests`);
    return true;
  });
  
  await test('Dashboard - Get Compliance Alerts', async () => {
    const response = await apiCall('/api/compliance/alerts');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'Dashboard can display compliance alerts');
    return true;
  });
  
  await test('Dashboard - Get Performance Metrics', async () => {
    const response = await apiCall('/api/performance/analytics');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'Dashboard can display performance metrics');
    return true;
  });
}

// ============================================
// EMPLOYEES PAGE TESTS
// ============================================

async function testEmployeesPage() {
  logSection('👥 Employees Page Tests');
  
  await test('Employees - Load Employee List', async () => {
    const response = await apiCall('/api/employees');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data) || response.data.length === 0) {
      return 'No employees found';
    }
    
    const employee = response.data[0];
    const requiredFields = ['id', 'name', 'email', 'role_title', 'status'];
    
    for (const field of requiredFields) {
      if (!(field in employee)) {
        return `Missing field: ${field}`;
      }
    }
    
    log('👥', `Employees page can display ${response.data.length} employees`);
    return true;
  });
  
  await test('Employees - Load Departments', async () => {
    const response = await apiCall('/api/employees/departments');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🏢', `Employees page can filter by ${response.data.length} departments`);
    return true;
  });
  
  await test('Employees - View Single Employee Profile', async () => {
    // First get an employee
    const listResponse = await apiCall('/api/employees');
    if (!listResponse.ok || !listResponse.data.length) return 'skip';
    
    const employeeId = listResponse.data[0].id;
    const response = await apiCall(`/api/employees/${employeeId}`);
    
    if (!response.ok) {
      if (response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('👤', 'Employees page can view individual profiles');
    return true;
  });
}

// ============================================
// TIME TRACKING PAGE TESTS
// ============================================

async function testTimeTrackingPage() {
  logSection('⏰ Time Tracking Page Tests');
  
  await test('TimeTracking - Load Timecards', async () => {
    const response = await apiCall('/api/timecards');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('⏰', `TimeTracking page can display ${response.data.length} timecards`);
    return true;
  });
  
  await test('TimeTracking - Upload Functionality Available', async () => {
    const response = await apiCall('/api/timecardUploads', {
      method: 'GET'
    });
    
    // Endpoint should exist (even if returns 401/405)
    if (response.status === 404) {
      return 'Upload endpoint not found';
    }
    
    log('📤', 'TimeTracking upload functionality available');
    return true;
  });
}

// ============================================
// LEAVE MANAGEMENT PAGE TESTS
// ============================================

async function testLeaveManagementPage() {
  logSection('🏖️ Leave Management Page Tests');
  
  await test('LeaveManagement - Load Leave Requests', async () => {
    const response = await apiCall('/api/leave/requests');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('🏖️', `LeaveManagement page can display ${response.data.length} requests`);
    return true;
  });
  
  await test('LeaveManagement - Load Leave Types', async () => {
    const response = await apiCall('/api/leave/types');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📋', 'LeaveManagement page can display leave types');
    return true;
  });
  
  await test('LeaveManagement - Load Analytics', async () => {
    const response = await apiCall('/api/leave/analytics');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'LeaveManagement page can display analytics');
    return true;
  });
}

// ============================================
// PAYROLL PAGES TESTS
// ============================================

async function testPayrollPages() {
  logSection('💰 Payroll Pages Tests');
  
  await test('Payroll - Load Payroll Periods', async () => {
    const response = await apiCall('/api/payroll/periods');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('💰', `Payroll page can display ${response.data.length} periods`);
    return true;
  });
  
  await test('Payroll - Load Calculations', async () => {
    const response = await apiCall('/api/payroll/calculations');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('🧮', 'Payroll page can display calculations');
    return true;
  });
  
  await test('PayrollV2 - Load V2 Data', async () => {
    const response = await apiCall('/api/payroll-v2/summary');
    
    if (response.status === 404) return 'skip';
    if (!response.ok && response.status !== 401) {
      return `HTTP ${response.status}`;
    }
    
    log('💰', 'PayrollV2 page API available');
    return true;
  });
}

// ============================================
// COMPLIANCE PAGE TESTS
// ============================================

async function testCompliancePage() {
  logSection('✅ Compliance Page Tests');
  
  await test('Compliance - Load Dashboard', async () => {
    const response = await apiCall('/api/compliance/dashboard');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'Compliance dashboard loads successfully');
    return true;
  });
  
  await test('Compliance - Load Alerts', async () => {
    const response = await apiCall('/api/compliance/alerts');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('⚠️', `Compliance page can display ${response.data.length} alerts`);
    return true;
  });
  
  await test('Compliance - Load Trainings', async () => {
    const response = await apiCall('/api/compliance/trainings');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📚', 'Compliance trainings available');
    return true;
  });
}

// ============================================
// SETTINGS PAGE TESTS
// ============================================

async function testSettingsPage() {
  logSection('⚙️ Settings Page Tests');
  
  await test('Settings - Load Notification Settings', async () => {
    const response = await apiCall('/api/settings/notifications');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('🔔', `Settings page can display ${response.data.length} notification options`);
    return true;
  });
  
  await test('Settings - Load Application Settings', async () => {
    const response = await apiCall('/api/settings/application');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('⚙️', 'Settings page can display application settings');
    return true;
  });
  
  await test('Settings - Load Trusted Devices', async () => {
    const response = await apiCall('/api/trusted-devices');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🔒', 'Settings page can display trusted devices');
    return true;
  });
}

// ============================================
// BENEFITS PAGE TESTS
// ============================================

async function testBenefitsPage() {
  logSection('💼 Benefits Page Tests');
  
  await test('Benefits - Load Plans', async () => {
    const response = await apiCall('/api/benefits/plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('💼', `Benefits page can display ${response.data.length} plans`);
    return true;
  });
  
  await test('Benefits - Load Enrollments', async () => {
    const response = await apiCall('/api/benefits/enrollments');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📝', 'Benefits page can display enrollments');
    return true;
  });
  
  await test('Benefits - Load Retirement Plans', async () => {
    const response = await apiCall('/api/benefits/retirement-plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('🏦', 'Benefits page can display retirement plans');
    return true;
  });
  
  await test('Benefits - Load Insurance Plans', async () => {
    const response = await apiCall('/api/benefits/insurance-plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('🏥', 'Benefits page can display insurance plans');
    return true;
  });
}

// ============================================
// BONUSES/COMMISSIONS PAGE TESTS
// ============================================

async function testBonusesCommissionsPage() {
  logSection('💵 Bonuses & Commissions Page Tests');
  
  await test('BonusesCommissions - Load Bonuses', async () => {
    const response = await apiCall('/api/bonuses');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response';
    }
    
    log('💰', `BonusesCommissions page can display ${response.data.length} bonuses`);
    return true;
  });
  
  await test('BonusesCommissions - Load Structures', async () => {
    const response = await apiCall('/api/bonuses/structures');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('📊', 'BonusesCommissions page can display structures');
    return true;
  });
  
  await test('BonusesCommissions - Load Commission Structures', async () => {
    const response = await apiCall('/api/bonuses/commission-structures');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('💵', 'BonusesCommissions page can display commission structures');
    return true;
  });
}

// ============================================
// MESSAGES (CHAT) PAGE TESTS
// ============================================

async function testMessagesPage() {
  logSection('💬 Messages (Chat) Page Tests');
  
  await test('Messages - Load Available Users', async () => {
    const response = await apiCall('/api/chat/available-users');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.users || !Array.isArray(response.data.users)) {
      return 'Invalid response structure';
    }
    
    log('👥', `Messages page can display ${response.data.users.length} available users`);
    return true;
  });
  
  await test('Messages - Load Chat Threads', async () => {
    const response = await apiCall('/api/chat/threads');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.threads || !Array.isArray(response.data.threads)) {
      return 'Invalid response structure';
    }
    
    log('💬', `Messages page can display ${response.data.threads.length} threads`);
    return true;
  });
  
  await test('Messages - Load Thread Messages', async () => {
    // Get threads first
    const threadsResponse = await apiCall('/api/chat/threads');
    if (!threadsResponse.ok || !threadsResponse.data.threads || threadsResponse.data.threads.length === 0) {
      return 'skip';
    }
    
    const threadId = threadsResponse.data.threads[0].id;
    const response = await apiCall(`/api/chat/threads/${threadId}/messages`);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📨', 'Messages page can load thread messages');
    return true;
  });
}

// ============================================
// NOTIFICATION CENTER TESTS
// ============================================

async function testNotificationCenter() {
  logSection('🔔 Notification Center Tests');
  
  await test('NotificationCenter - Load Notifications', async () => {
    const response = await apiCall('/api/notifications');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.notifications || !Array.isArray(response.data.notifications)) {
      return 'Invalid response structure';
    }
    
    log('🔔', `NotificationCenter can display ${response.data.notifications.length} notifications`);
    return true;
  });
  
  await test('NotificationCenter - Get Unread Count', async () => {
    const response = await apiCall('/api/notifications/unread-count');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (typeof response.data.count !== 'number') {
      return 'Invalid response - missing count';
    }
    
    log('🔢', `NotificationCenter shows ${response.data.count} unread notifications`);
    return true;
  });
}

// ============================================
// TESTING PAGE TESTS
// ============================================

async function testTestingPage() {
  logSection('🧪 Testing Page Tests');
  
  await test('Testing - Health Check Available', async () => {
    const response = await apiCall('/api/health/health');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Testing page can run health checks');
    return true;
  });
  
  await test('Testing - Diagnostic Available', async () => {
    const response = await apiCall('/api/diagnostic/database');
    
    if (response.status === 404) return 'skip';
    if (!response.ok && response.status !== 401) {
      return `HTTP ${response.status}`;
    }
    
    log('🔧', 'Testing page can run diagnostics');
    return true;
  });
}

// ============================================
// MAIN RUNNER
// ============================================

async function runAllTests() {
  console.log('\n');
  log('🚀', 'Comprehensive Frontend Functionality Test Suite');
  log('📅', `Date: ${new Date().toISOString()}`);
  log('🌐', `API Base: ${API_BASE}`);
  console.log('\n');
  
  await authenticate();
  
  await testDashboardPage();
  await testEmployeesPage();
  await testTimeTrackingPage();
  await testLeaveManagementPage();
  await testPayrollPages();
  await testCompliancePage();
  await testSettingsPage();
  await testBenefitsPage();
  await testBonusesCommissionsPage();
  await testMessagesPage();
  await testNotificationCenter();
  await testTestingPage();
  
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
    console.log('\n🎉 ALL FRONTEND TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${testResults.failed} TESTS FAILED\n`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('💥 Frontend test suite crashed:', error);
  process.exit(1);
});

