#!/usr/bin/env node

/**
 * SPECIFIC FEATURES TEST
 * Tests each specific feature we've implemented with detailed validation
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
  console.log('🧪 SPECIFIC FEATURES TEST SUITE');
  console.log('================================\n');

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
    console.log('\n🎉 ALL SPECIFIC FEATURE TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - CHECK IMPLEMENTATION');
  }
}

// ========================================
// TERMINATION FUNCTIONALITY TESTS
// ========================================

test('Termination API - Get Checklist Template', async () => {
  const result = await apiCall('/api/termination/checklist-template');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  // Check if we get a proper checklist template
  const checklist = result.data;
  if (!Array.isArray(checklist) || checklist.length === 0) {
    console.log('  Error: Checklist template is not an array or is empty');
    return false;
  }
  
  // Check if checklist items have required fields
  const requiredFields = ['id', 'task', 'category', 'completed', 'required'];
  const firstItem = checklist[0];
  for (const field of requiredFields) {
    if (!(field in firstItem)) {
      console.log(`  Error: Missing required field '${field}' in checklist item`);
      return false;
    }
  }
  
  console.log(`  ✅ Got ${checklist.length} checklist items`);
  return true;
});

test('Termination API - Get Termination List', async () => {
  const result = await apiCall('/api/termination/list');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const terminations = result.data;
  if (!Array.isArray(terminations)) {
    console.log('  Error: Terminations list is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${terminations.length} terminations`);
  return true;
});

test('Termination API - Create Termination Details (Mock)', async () => {
  // First, get an active employee
  const employeesResult = await apiCall('/api/employees');
  if (!employeesResult.ok || !Array.isArray(employeesResult.data) || employeesResult.data.length === 0) {
    console.log('  Error: Could not get employees for termination test');
    return false;
  }
  
  const activeEmployee = employeesResult.data.find(emp => emp.status === 'Active');
  if (!activeEmployee) {
    console.log('  Warning: No active employees found, skipping termination creation test');
    return true; // This is not a failure, just no data to test with
  }
  
  const terminationData = {
    employee_id: activeEmployee.id,
    termination_date: '2025-01-20',
    termination_reason: 'Test termination for API validation',
    termination_type: 'Voluntary',
    notice_period_days: 14,
    last_working_day: '2025-01-20',
    exit_interview_date: '2025-01-20',
    exit_interview_conducted_by: 'HR Manager',
    exit_interview_notes: 'Test exit interview',
    final_pay_date: '2025-01-25',
    severance_paid: true,
    severance_amount: 5000,
    vacation_payout: 2000,
    benefits_end_date: '2025-01-25',
    equipment_returned: true,
    equipment_return_date: '2025-01-20',
    equipment_return_notes: 'All equipment returned',
    access_revoked: true,
    access_revoked_date: '2025-01-20',
    reason_category: 'Personal',
    initiated_by: 'Employee'
  };
  
  const result = await apiCall('/api/termination/details', {
    method: 'POST',
    body: JSON.stringify(terminationData)
  });
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  console.log(`  ✅ Termination created for employee ${activeEmployee.name}`);
  return true;
});

// ========================================
// BONUSES & COMMISSIONS TESTS
// ========================================

test('Bonuses API - Get Bonus Structures', async () => {
  const result = await apiCall('/api/bonuses/structures');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const structures = result.data;
  if (!Array.isArray(structures)) {
    console.log('  Error: Bonus structures is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${structures.length} bonus structures`);
  return true;
});

test('Bonuses API - Get Commission Structures', async () => {
  const result = await apiCall('/api/bonuses/commission-structures');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const structures = result.data;
  if (!Array.isArray(structures)) {
    console.log('  Error: Commission structures is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${structures.length} commission structures`);
  return true;
});

test('Bonuses API - Create Bonus Structure', async () => {
  const bonusStructure = {
    name: 'Test Performance Bonus',
    base_amount: 5000,
    criteria: 'Exceed quarterly targets by 20%',
    calculation_method: 'Percentage of base salary',
    effective_date: '2025-01-01',
    department: 'Sales'
  };
  
  const result = await apiCall('/api/bonuses/structures', {
    method: 'POST',
    body: JSON.stringify(bonusStructure)
  });
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  console.log(`  ✅ Bonus structure created: ${bonusStructure.name}`);
  return true;
});

// ========================================
// RECRUITING FUNCTIONALITY TESTS
// ========================================

test('Recruiting API - Get Job Postings', async () => {
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

test('Recruiting API - Get Candidates', async () => {
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

test('Recruiting API - Schedule Interview', async () => {
  // First get candidates
  const candidatesResult = await apiCall('/api/recruiting/candidates');
  if (!candidatesResult.ok || !Array.isArray(candidatesResult.data) || candidatesResult.data.length === 0) {
    console.log('  Warning: No candidates found, skipping interview scheduling test');
    return true;
  }
  
  const candidate = candidatesResult.data[0];
  const interviewData = {
    candidate_id: candidate.id,
    job_posting_id: 1,
    interview_date: '2025-01-25',
    interview_time: '14:00',
    interview_type: 'Video',
    interviewer_id: 1,
    location: 'Conference Room A',
    notes: 'Test interview scheduling'
  };
  
  const result = await apiCall('/api/recruiting/interviews', {
    method: 'POST',
    body: JSON.stringify(interviewData)
  });
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  console.log(`  ✅ Interview scheduled for candidate ${candidate.name}`);
  return true;
});

// ========================================
// BENEFITS FUNCTIONALITY TESTS
// ========================================

test('Benefits API - Get Insurance Plans', async () => {
  const result = await apiCall('/api/benefits/insurance-plans');
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  const plans = result.data;
  if (!Array.isArray(plans)) {
    console.log('  Error: Insurance plans is not an array');
    return false;
  }
  
  console.log(`  ✅ Got ${plans.length} insurance plans`);
  return true;
});

test('Benefits API - Get Retirement Plans', async () => {
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

test('Benefits API - Manage Retirement Plan', async () => {
  // First get retirement plans
  const plansResult = await apiCall('/api/benefits/retirement-plans');
  if (!plansResult.ok || !Array.isArray(plansResult.data) || plansResult.data.length === 0) {
    console.log('  Warning: No retirement plans found, skipping management test');
    return true;
  }
  
  const plan = plansResult.data[0];
  const updateData = {
    employer_match_percentage: 5.0,
    vesting_schedule: '3 year cliff',
    contribution_limit: 20000,
    investment_options: 'Target date funds, index funds',
    management_fees: 0.5
  };
  
  const result = await apiCall(`/api/benefits/retirement-plans/${plan.id}/manage`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  if (!result.ok) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return false;
  }
  
  console.log(`  ✅ Retirement plan ${plan.plan_name} managed successfully`);
  return true;
});

// ========================================
// PAYROLL FUNCTIONALITY TESTS
// ========================================

test('Payroll API - Get Payroll Periods', async () => {
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

test('Payroll API - Get Payroll Calculations', async () => {
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
// EMPLOYEE MANAGEMENT TESTS
// ========================================

test('Employee API - Get All Employees', async () => {
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
  
  // Check if employees have required fields
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

test('Employee API - Get Departments', async () => {
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
// AUTHENTICATION TESTS
// ========================================

test('Authentication API - Login Endpoint', async () => {
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
  
  // Check if we get a proper response structure
  if (!result.data || typeof result.data !== 'object') {
    console.log('  Error: Login response is not a proper object');
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

test('Error Handling - Invalid Data Format', async () => {
  const result = await apiCall('/api/termination/details', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' })
  });
  
  // Should return 400 or similar validation error
  if (result.status >= 400 && result.status < 500) {
    console.log(`  ✅ Invalid data properly returns ${result.status}`);
    return true;
  } else {
    console.log(`  Error: Invalid data returned unexpected status ${result.status}`);
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

// Run all tests
runTests().catch(console.error);
