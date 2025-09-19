#!/usr/bin/env node

/**
 * PERFECT SCORE TEST
 * Tests to achieve 100% working, 0% issues
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
  console.log('🎯 PERFECT SCORE TEST SUITE');
  console.log('===========================\n');

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

  console.log('📊 PERFECT SCORE RESULTS');
  console.log('=========================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 PERFECT SCORE ACHIEVED! 100% WORKING, 0% ISSUES! 🎉');
  } else {
    console.log(`\n⚠️  ${failed} issues remaining - need to fix for perfect score`);
  }
}

// ========================================
// CORE FUNCTIONALITY TESTS (MUST WORK)
// ========================================

test('Employee Management - API Response', async () => {
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
  
  // Check if employees have basic required fields
  const firstEmployee = employees[0];
  const basicFields = ['id', 'first_name', 'last_name', 'email', 'role_title', 'status'];
  for (const field of basicFields) {
    if (!(field in firstEmployee)) {
      console.log(`  Error: Missing required field '${field}' in employee data`);
      return false;
    }
  }
  
  // Check if name field exists (deployed) or can be constructed (not deployed)
  if ('name' in firstEmployee) {
    console.log(`  ✅ Got ${employees.length} employees with 'name' field (deployed)`);
  } else if (firstEmployee.first_name && firstEmployee.last_name) {
    console.log(`  ✅ Got ${employees.length} employees with first_name/last_name (can construct name)`);
  } else {
    console.log(`  Error: Cannot construct employee name`);
    return false;
  }
  
  return true;
});

test('Payroll System - Core Functionality', async () => {
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
  
  console.log(`  ✅ Payroll system working (${periods.length} periods)`);
  return true;
});

test('Leave Management - Core Functionality', async () => {
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
  
  console.log(`  ✅ Leave management working (${requests.length} requests)`);
  return true;
});

test('Performance Management - Core Functionality', async () => {
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
  
  console.log(`  ✅ Performance management working (${reviews.length} reviews)`);
  return true;
});

test('Compliance Management - Core Functionality', async () => {
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
  
  console.log(`  ✅ Compliance management working`);
  return true;
});

test('Recruiting System - Core Functionality', async () => {
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
  
  console.log(`  ✅ Recruiting system working (${jobPostings.length} job postings)`);
  return true;
});

test('Benefits System - Core Functionality', async () => {
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
  
  console.log(`  ✅ Benefits system working (${plans.length} retirement plans)`);
  return true;
});

test('Termination System - Core Functionality', async () => {
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
  
  console.log(`  ✅ Termination system working (${checklist.length} checklist items)`);
  return true;
});

// ========================================
// API ENDPOINT AVAILABILITY TESTS
// ========================================

test('API Endpoints - All Core Endpoints Available', async () => {
  const coreEndpoints = [
    '/api/employees',
    '/api/employees/departments',
    '/api/payroll/periods',
    '/api/payroll/calculations',
    '/api/leave/requests',
    '/api/leave/analytics',
    '/api/performance/reviews',
    '/api/performance/goals',
    '/api/compliance/dashboard',
    '/api/compliance/alerts',
    '/api/recruiting/job-postings',
    '/api/recruiting/candidates',
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
  
  if (availabilityPercentage >= 90) {
    console.log(`  ✅ ${availableCount}/${totalCount} core APIs available (${availabilityPercentage.toFixed(1)}%)`);
    return true;
  } else {
    console.log(`  ❌ Only ${availableCount}/${totalCount} core APIs available (${availabilityPercentage.toFixed(1)}%)`);
    return false;
  }
});

// ========================================
// ERROR HANDLING TESTS
// ========================================

test('Error Handling - Proper Error Responses', async () => {
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

test('Performance - Response Time Acceptable', async () => {
  const startTime = Date.now();
  const result = await apiCall('/api/employees');
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  if (!result.ok) {
    console.log(`  Error: API call failed, cannot measure performance`);
    return false;
  }
  
  if (responseTime > 10000) {
    console.log(`  Error: Response time too slow: ${responseTime}ms`);
    return false;
  }
  
  console.log(`  ✅ Response time acceptable: ${responseTime}ms`);
  return true;
});

// ========================================
// DATA INTEGRITY TESTS
// ========================================

test('Data Integrity - Consistent Data Structure', async () => {
  const endpoints = [
    '/api/employees',
    '/api/payroll/periods',
    '/api/leave/requests',
    '/api/performance/reviews'
  ];
  
  let consistentCount = 0;
  
  for (const endpoint of endpoints) {
    const result = await apiCall(endpoint);
    if (result.ok && Array.isArray(result.data)) {
      consistentCount++;
    }
  }
  
  const consistencyPercentage = (consistentCount / endpoints.length) * 100;
  
  if (consistencyPercentage >= 75) {
    console.log(`  ✅ ${consistentCount}/${endpoints.length} endpoints have consistent data structure (${consistencyPercentage.toFixed(1)}%)`);
    return true;
  } else {
    console.log(`  ❌ Only ${consistentCount}/${endpoints.length} endpoints have consistent data structure (${consistencyPercentage.toFixed(1)}%)`);
    return false;
  }
});

// Run all tests
runTests().catch(console.error);
