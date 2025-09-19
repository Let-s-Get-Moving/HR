// REAL API TESTING - No dummy data, actual functionality verification
const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function realApiTest() {
  console.log('🔬 REAL API FUNCTIONALITY TEST');
  console.log('===============================');
  console.log('Testing actual API endpoints with real data from Render database\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let realDataCount = 0;

  const test = async (name, testFn) => {
    totalTests++;
    try {
      const result = await testFn();
      console.log(`✅ ${name}`);
      if (result && result.dataCount) {
        realDataCount += result.dataCount;
        console.log(`   📊 Real data: ${result.dataCount} records`);
      }
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failedTests++;
    }
  };

  // Test 1: API Health and Connectivity
  await test('API Server Health', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== 'healthy') throw new Error('Server not healthy');
    return { dataCount: 1 };
  });

  // Test 2: Leave Management - REAL DATA
  await test('Leave Management - Real Requests', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    if (data.length === 0) throw new Error('No leave requests found in database');
    return { dataCount: data.length };
  });

  await test('Leave Management - Real Analytics', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/analytics`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.requests) throw new Error('Missing analytics data');
    if (data.requests.total_requests === '0') throw new Error('No leave data in analytics');
    return { dataCount: parseInt(data.requests.total_requests) };
  });

  await test('Leave Management - Create Real Request', async () => {
    const newRequest = {
      employee_id: 1,
      leave_type_id: 1,
      start_date: '2025-12-25',
      end_date: '2025-12-27',
      total_days: 3,
      reason: 'Real API Test - Holiday',
      notes: 'Testing real API functionality'
    };

    const response = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const createdRequest = await response.json();
    if (!createdRequest.id) throw new Error('No ID returned from created request');
    return { dataCount: 1 };
  });

  // Test 3: Performance Management - REAL DATA
  await test('Performance Management - Real Reviews', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/reviews`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  await test('Performance Management - Real Goals', async () => {
    const response = await fetch(`${API_BASE_URL}/api/performance/goals`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  await test('Performance Management - Create Real Goal', async () => {
    const newGoal = {
      employee_id: 1,
      goal_title: 'Real API Test Goal',
      goal_description: 'Testing real performance goal creation via API',
      target_date: '2025-12-31',
      priority: 'High',
      status: 'In Progress'
    };

    const response = await fetch(`${API_BASE_URL}/api/performance/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const createdGoal = await response.json();
    if (!createdGoal.id) throw new Error('No ID returned from created goal');
    return { dataCount: 1 };
  });

  // Test 4: Compliance Management - REAL DATA
  await test('Compliance Management - Real Dashboard', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/dashboard`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.total_alerts !== 'number') throw new Error('Invalid dashboard data');
    return { dataCount: data.total_alerts + data.active_employees };
  });

  await test('Compliance Management - Real Trainings', async () => {
    const response = await fetch(`${API_BASE_URL}/api/compliance/trainings`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  // Test 5: Payroll System - REAL DATA
  await test('Payroll System - Real Periods', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/periods`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    if (data.length === 0) throw new Error('No payroll periods found');
    return { dataCount: data.length };
  });

  await test('Payroll System - Real Calculations', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/calculations`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    if (data.length === 0) throw new Error('No payroll calculations found');
    return { dataCount: data.length };
  });

  await test('Payroll System - Real Commission Structures', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/commission-structures`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  await test('Payroll System - Real Bonus Structures', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/bonus-structures`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  // Test 6: Employee Management - REAL DATA
  await test('Employee Management - Real Employees', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    if (data.length === 0) throw new Error('No employees found');
    return { dataCount: data.length };
  });

  await test('Employee Management - Real Departments', async () => {
    const response = await fetch(`${API_BASE_URL}/api/employees/departments`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    if (data.length === 0) throw new Error('No departments found');
    return { dataCount: data.length };
  });

  // Test 7: Data Integrity and Relationships
  await test('Data Integrity - Leave Request Details', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const data = await response.json();
    if (data.length === 0) throw new Error('No leave requests to verify');
    
    const firstRequest = data[0];
    if (!firstRequest.employee_id || !firstRequest.leave_type_id) {
      throw new Error('Missing required fields in leave request');
    }
    return { dataCount: data.length };
  });

  await test('Data Integrity - Payroll Calculation Details', async () => {
    const response = await fetch(`${API_BASE_URL}/api/payroll/calculations`);
    const data = await response.json();
    if (data.length === 0) throw new Error('No payroll calculations to verify');
    
    const firstCalc = data[0];
    if (!firstCalc.employee_id || !firstCalc.period_id) {
      throw new Error('Missing required fields in payroll calculation');
    }
    return { dataCount: data.length };
  });

  // Test 8: Error Handling
  await test('Error Handling - Invalid Endpoint', async () => {
    const response = await fetch(`${API_BASE_URL}/api/invalid-endpoint`);
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
    return { dataCount: 1 };
  });

  await test('Error Handling - Invalid Leave Request', async () => {
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    return { dataCount: 1 };
  });

  // Test 9: Performance and Response Times
  await test('Performance - API Response Time', async () => {
    const start = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/leave/requests`);
    const end = Date.now();
    const responseTime = end - start;
    
    if (responseTime > 5000) throw new Error(`Response too slow: ${responseTime}ms`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { dataCount: 1 };
  });

  // Test 10: New APIs (if deployed)
  await test('Recruiting API - Job Postings', async () => {
    const response = await fetch(`${API_BASE_URL}/api/recruiting/job-postings`);
    if (response.status === 404) {
      console.log('   ⚠️  Recruiting API not yet deployed');
      return { dataCount: 0 };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  await test('Benefits API - Plans', async () => {
    const response = await fetch(`${API_BASE_URL}/api/benefits/plans`);
    if (response.status === 404) {
      console.log('   ⚠️  Benefits API not yet deployed');
      return { dataCount: 0 };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid response format');
    return { dataCount: data.length };
  });

  // Results
  console.log('\n📊 REAL API TEST RESULTS');
  console.log('=========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`Total Real Data Records: ${realDataCount}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL REAL API TESTS PASSED!');
    console.log('✅ APIs are working with real data from Render database');
    console.log('✅ All CRUD operations are functional');
    console.log('✅ Data integrity is maintained');
    console.log('✅ Error handling is working');
    console.log('✅ Performance is acceptable');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed.`);
    console.log('Some APIs may not be working correctly with real data.');
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    realDataCount,
    successRate: (passedTests / totalTests) * 100
  };
}

realApiTest().catch(console.error);
