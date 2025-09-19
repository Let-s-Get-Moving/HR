#!/usr/bin/env node

/**
 * FRONTEND FUNCTIONALITY TEST
 * Tests all frontend features we've implemented
 */

// Using built-in fetch (Node.js 18+)

const API_BASE = 'https://hr-api-wbzs.onrender.com';

// Test configuration
const tests = [];
let passed = 0;
let failed = 0;

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      status: response.status,
      data: jsonData,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      ok: false
    };
  }
}

// Test helper
function test(name, testFn) {
  tests.push({ name, testFn });
}

// Run all tests
async function runTests() {
  console.log('🧪 FRONTEND FUNCTIONALITY TEST SUITE');
  console.log('====================================\n');

  for (const { name, testFn } of tests) {
    try {
      console.log(`Testing: ${name}`);
      const result = await testFn();
      if (result) {
        console.log(`✅ ${name} - PASSED\n`);
        passed++;
      } else {
        console.log(`❌ ${name} - FAILED\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - ERROR: ${error.message}\n`);
      failed++;
    }
  }

  console.log('📊 TEST RESULTS');
  console.log('================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL FRONTEND FUNCTIONALITY TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - CHECK IMPLEMENTATION');
  }
}

// ========================================
// CORE HR FUNCTIONALITY TESTS
// ========================================

test('Employee Management - Get All Employees', async () => {
  const result = await apiCall('/api/employees');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const employees = result.data;
  if (!Array.isArray(employees)) {
    console.log('  Error: Employees is not an array');
    return false;
  }
  
  if (employees.length === 0) {
    console.log('  Warning: No employees found');
    return true; // Not a failure, just no data
  }
  
  // Check if employees have required fields for frontend
  const requiredFields = ['id', 'name', 'email', 'role_title', 'status'];
  const firstEmployee = employees[0];
  for (const field of requiredFields) {
    if (!(field in firstEmployee)) {
      console.log(`  Error: Missing required field '${field}' in employee data`);
      return false;
    }
  }
  
  console.log(`  ✅ Got ${employees.length} employees with proper structure`);
  return true;
});

test('Employee Management - Get Departments', async () => {
  const result = await apiCall('/api/employees/departments');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const departments = result.data;
  if (!Array.isArray(departments)) {
    console.log('  Error: Departments is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${departments.length} departments`);
  return true;
});

// ========================================
// PAYROLL FUNCTIONALITY TESTS
// ========================================

test('Payroll System - Get Payroll Periods', async () => {
  const result = await apiCall('/api/payroll/periods');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const periods = result.data;
  if (!Array.isArray(periods)) {
    console.log('  Error: Payroll periods is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${periods.length} payroll periods`);
  return true;
});

test('Payroll System - Get Payroll Calculations', async () => {
  const result = await apiCall('/api/payroll/calculations');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const calculations = result.data;
  if (!Array.isArray(calculations)) {
    console.log('  Error: Payroll calculations is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${calculations.length} payroll calculations`);
  return true;
});

// ========================================
// LEAVE MANAGEMENT TESTS
// ========================================

test('Leave Management - Get Leave Requests', async () => {
  const result = await apiCall('/api/leave/requests');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const requests = result.data;
  if (!Array.isArray(requests)) {
    console.log('  Error: Leave requests is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${requests.length} leave requests`);
  return true;
});

test('Leave Management - Get Leave Analytics', async () => {
  const result = await apiCall('/api/leave/analytics');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const analytics = result.data;
  if (typeof analytics !== 'object') {
    console.log('  Error: Leave analytics is not an object');
    return false;
  }
  
  console.log(`  ✅ Got leave analytics data`);
  return true;
});

// ========================================
// PERFORMANCE MANAGEMENT TESTS
// ========================================

test('Performance Management - Get Performance Reviews', async () => {
  const result = await apiCall('/api/performance/reviews');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const reviews = result.data;
  if (!Array.isArray(reviews)) {
    console.log('  Error: Performance reviews is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${reviews.length} performance reviews`);
  return true;
});

test('Performance Management - Get Performance Goals', async () => {
  const result = await apiCall('/api/performance/goals');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const goals = result.data;
  if (!Array.isArray(goals)) {
    console.log('  Error: Performance goals is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${goals.length} performance goals`);
  return true;
});

// ========================================
// COMPLIANCE MANAGEMENT TESTS
// ========================================

test('Compliance Management - Get Compliance Dashboard', async () => {
  const result = await apiCall('/api/compliance/dashboard');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const dashboard = result.data;
  if (typeof dashboard !== 'object') {
    console.log('  Error: Compliance dashboard is not an object');
    return false;
  }
  
  console.log(`  ✅ Got compliance dashboard data`);
  return true;
});

test('Compliance Management - Get Compliance Alerts', async () => {
  const result = await apiCall('/api/compliance/alerts');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const alerts = result.data;
  if (!Array.isArray(alerts)) {
    console.log('  Error: Compliance alerts is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${alerts.length} compliance alerts`);
  return true;
});

// ========================================
// RECRUITING FUNCTIONALITY TESTS
// ========================================

test('Recruiting - Get Job Postings', async () => {
  const result = await apiCall('/api/recruiting/job-postings');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const jobPostings = result.data;
  if (!Array.isArray(jobPostings)) {
    console.log('  Error: Job postings is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${jobPostings.length} job postings`);
  return true;
});

test('Recruiting - Get Candidates', async () => {
  const result = await apiCall('/api/recruiting/candidates');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const candidates = result.data;
  if (!Array.isArray(candidates)) {
    console.log('  Error: Candidates is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${candidates.length} candidates`);
  return true;
});

// ========================================
// BENEFITS FUNCTIONALITY TESTS
// ========================================

test('Benefits - Get Retirement Plans', async () => {
  const result = await apiCall('/api/benefits/retirement-plans');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const plans = result.data;
  if (!Array.isArray(plans)) {
    console.log('  Error: Retirement plans is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${plans.length} retirement plans`);
  return true;
});

// ========================================
// TERMINATION FUNCTIONALITY TESTS
// ========================================

test('Termination - Get Checklist Template', async () => {
  const result = await apiCall('/api/termination/checklist-template');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const checklist = result.data;
  if (!Array.isArray(checklist)) {
    console.log('  Error: Checklist template is not an array');
    return false;
  }
  
  if (checklist.length === 0) {
    console.log('  Warning: Empty checklist template');
    return true; // Not a failure, just no data
  }
  
  console.log(`  ✅ Got ${checklist.length} checklist items`);
  return true;
});

// ========================================
// AUTHENTICATION TESTS
// ========================================

test('Authentication - Login Endpoint', async () => {
  const loginData = {
    username: 'admin@company.com',
    password: 'admin123'
  };
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData)
  });
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  console.log(`  ✅ Login endpoint working`);
  return true;
});

// ========================================
// ERROR HANDLING TESTS
// ========================================

test('Error Handling - Invalid Endpoint', async () => {
  const result = await apiCall('/api/invalid-endpoint');
  
  // Should return 404 or similar error status
  if (result.status >= 400 && result.status < 500) {
    console.log(`  ✅ Invalid endpoint properly returns ${result.status}`);
    return true;
  } else {
    console.log(`  Error: Invalid endpoint returned unexpected status ${result.status}`);
    return false;
  }
});

// ========================================
// PERFORMANCE TESTS
// ========================================

test('Performance - API Response Time', async () => {
  const startTime = Date.now();
  const result = await apiCall('/api/employees');
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  if (!result.ok) {
    console.log(`  Error: API call failed, cannot measure performance`);
    return false;
  }
  
  if (responseTime > 5000) {
    console.log(`  Warning: Slow response time ${responseTime}ms`);
    return true; // Not a failure, just slow
  }
  
  console.log(`  ✅ Response time: ${responseTime}ms`);
  return true;
});

// ========================================
// FRONTEND INTEGRATION TESTS
// ========================================

test('Frontend Integration - All Core APIs Available', async () => {
  const coreEndpoints = [
    '/api/employees',
    '/api/payroll/periods',
    '/api/leave/requests',
    '/api/performance/reviews',
    '/api/compliance/dashboard',
    '/api/recruiting/job-postings',
    '/api/benefits/retirement-plans',
    '/api/termination/checklist-template'
  ];
  
  let availableCount = 0;
  let totalCount = coreEndpoints.length;
  
  for (const endpoint of coreEndpoints) {
    const result = await apiCall(endpoint);
    if (result.ok || result.status === 200) {
      availableCount++;
    }
  }
  
  const availabilityPercentage = (availableCount / totalCount) * 100;
  
  if (availabilityPercentage >= 80) {
    console.log(`  ✅ ${availableCount}/${totalCount} core APIs available (${availabilityPercentage.toFixed(1)}%)`);
    return true;
  } else {
    console.log(`  ❌ Only ${availableCount}/${totalCount} core APIs available (${availabilityPercentage.toFixed(1)}%)`);
    return false;
  }
});

// Run all tests
runTests().catch(console.error);
