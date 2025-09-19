// Comprehensive test to ensure 100% functionality
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function comprehensiveTest() {
  console.log('🧪 COMPREHENSIVE HR SYSTEM TEST');
  console.log('================================\n');

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

  // Test 1: API Health
  await test('API Health Check', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health/health`);
    const data = await response.json();
    if (data.status !== 'healthy') throw new Error('API not healthy');
  });

  // Test 2: Leave Management
  await test('Leave Management - Get Requests', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Leave Management - Get Analytics', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/analytics`);
    const data = await response.json();
    if (!data.requests) throw new Error('Missing analytics data');
  });

  await test('Leave Management - Create Request', async () => {
    const newRequest = {
      employee_id: 1,
      leave_type_id: 1,
      start_date: '2025-12-25',
      end_date: '2025-12-27',
      total_days: 3,
      reason: 'Comprehensive test',
      notes: 'Test request for 100% functionality check'
    };

    const response = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  });

  // Test 3: Performance Management
  await test('Performance Management - Get Reviews', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/reviews`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Performance Management - Get Goals', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/goals`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Performance Management - Get Analytics', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/analytics`);
    const data = await response.json();
    if (!data.average_rating) throw new Error('Missing analytics data');
  });

  // Test 4: Compliance Management
  await test('Compliance Management - Get Dashboard', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/dashboard`);
    const data = await response.json();
    if (!data.total_alerts && data.total_alerts !== 0) throw new Error('Missing dashboard data');
  });

  await test('Compliance Management - Get Alerts', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/alerts`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Compliance Management - Get Trainings', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/trainings`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  // Test 5: Payroll System
  await test('Payroll System - Get Periods', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/periods`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No payroll periods found');
  });

  await test('Payroll System - Get Calculations', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/calculations`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Payroll System - Get Commission Structures', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/commission-structures`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  await test('Payroll System - Get Bonus Structures', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/bonus-structures`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
  });

  // Test 6: Employee Management
  await test('Employee Management - Get Employees', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No employees found');
  });

  await test('Employee Management - Get Departments', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees/departments`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No departments found');
  });

  // Test 7: Authentication
  await test('Authentication - Login Endpoint', async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    // We expect this to fail with invalid credentials, but endpoint should exist
    if (response.status === 404) throw new Error('Login endpoint not found');
  });

  // Test 8: Data Integrity
  await test('Data Integrity - Leave Requests Count', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const data = await response.json();
    if (data.length < 20) throw new Error(`Expected at least 20 leave requests, got ${data.length}`);
  });

  await test('Data Integrity - Payroll Calculations Count', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/calculations`);
    const data = await response.json();
    if (data.length < 10) throw new Error(`Expected at least 10 payroll calculations, got ${data.length}`);
  });

  await test('Data Integrity - Employee Count', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees`);
    const data = await response.json();
    if (data.length < 15) throw new Error(`Expected at least 15 employees, got ${data.length}`);
  });

  // Test 9: Error Handling
  await test('Error Handling - Invalid Endpoint', async () => {
    const response = await fetch(`${API_BASE_URL}/api/invalid-endpoint`);
    if (response.status !== 404) throw new Error('Should return 404 for invalid endpoint');
  });

  await test('Error Handling - Invalid Leave Request', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    if (response.status !== 400) throw new Error('Should return 400 for invalid request');
  });

  // Test 10: Performance
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
    console.log('\n🎉 ALL TESTS PASSED! HR SYSTEM IS 100% FUNCTIONAL! 🎉');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed. System needs attention.`);
  }

  return failedTests === 0;
}

comprehensiveTest().catch(console.error);
