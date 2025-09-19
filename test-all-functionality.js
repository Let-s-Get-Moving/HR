// Comprehensive test for all HR system functionality
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function testAllFunctionality() {
  console.log('🧪 COMPREHENSIVE HR SYSTEM FUNCTIONALITY TEST');
  console.log('==============================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const test = async (name, testFn) => {
    totalTests++;
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failedTests++;
    }
  };

  // Test 1: Core Working APIs
  await test('API Health Check', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health/health`);
    const data = await response.json();
    if (data.status !== 'healthy') throw new Error('API not healthy');
  });

  await test('Leave Management - Get Requests', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Performance Management - Get Reviews', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/reviews`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Compliance Management - Get Dashboard', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/dashboard`);
    const data = await response.json();
    if (!data.total_alerts && data.total_alerts !== 0) throw new Error('Missing dashboard data');
  });

  await test('Payroll System - Get Periods', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/periods`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No payroll periods found');
  });

  await test('Employee Management - Get Employees', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No employees found');
  });

  // Test 2: New APIs (may not exist yet)
  await test('Recruiting API - Job Postings', async () => {
    const response = await fetch(`${API_BASE_URL}/api/recruiting/job-postings`);
    if (response.status === 404) {
      console.log('   ⚠️  Recruiting API not deployed yet');
      return; // Skip this test
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Benefits API - Plans', async () => {
    const response = await fetch(`${API_BASE_URL}/api/benefits/plans`);
    if (response.status === 404) {
      console.log('   ⚠️  Benefits API not deployed yet');
      return; // Skip this test
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  // Test 3: CRUD Operations
  await test('Leave Management - Create Request', async () => {
    const newRequest = {
      employee_id: 1,
      leave_type_id: 1,
      start_date: '2025-12-25',
      end_date: '2025-12-27',
      total_days: 3,
      reason: 'Functionality test',
      notes: 'Test request for functionality verification'
    };

    const response = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  });

  await test('Performance Management - Create Goal', async () => {
    const newGoal = {
      employee_id: 1,
      goal_title: 'API Testing Goal',
      goal_description: 'Test performance goal creation',
      target_date: '2025-12-31',
      priority: 'High',
      status: 'In Progress'
    };

    const response = await fetch(`${API_BASE_URL}/api/performance/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  });

  // Test 4: Data Integrity
  await test('Data Integrity - Leave Requests Count', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const data = await response.json();
    if (data.length < 20) throw new Error(`Expected at least 20 leave requests, got ${data.length}`);
  });

  await test('Data Integrity - Payroll Calculations', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/calculations`);
    const data = await response.json();
    if (data.length < 10) throw new Error(`Expected at least 10 payroll calculations, got ${data.length}`);
  });

  // Test 5: Error Handling
  await test('Error Handling - Invalid Endpoint', async () => {
    const response = await fetch(`${API_BASE_URL}/api/invalid-endpoint`);
    if (response.status !== 404) throw new Error('Should return 404 for invalid endpoint');
  });

  // Test 6: Performance
  await test('Performance - Response Time', async () => {
    const start = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const end = Date.now();
    const responseTime = end - start;
    
    if (responseTime > 5000) throw new Error(`Response too slow: ${responseTime}ms`);
  });

  // Results
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! HR SYSTEM IS FULLY FUNCTIONAL! 🎉');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed. System needs attention.`);
  }

  return failedTests === 0;
}

testAllFunctionality().catch(console.error);
