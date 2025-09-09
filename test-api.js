#!/usr/bin/env node

// Simple API test script to verify endpoints are working
const API_BASE_URL = process.env.API_URL || 'https://hr-api-wbzs.onrender.com';

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.text();
    
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`   Error: ${result}`);
      return false;
    }
    
    try {
      const json = JSON.parse(result);
      console.log(`   Response: ${JSON.stringify(json).substring(0, 100)}...`);
    } catch {
      console.log(`   Response: ${result.substring(0, 100)}...`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing HR API Endpoints...\n');
  
  const tests = [
    { endpoint: '/api/health', method: 'GET' },
    { endpoint: '/api/test', method: 'GET' },
    { endpoint: '/api/employees', method: 'GET' },
    { endpoint: '/api/payroll/periods', method: 'GET' },
    { endpoint: '/api/payroll/calculations', method: 'GET' },
    { endpoint: '/api/payroll/calculations/29', method: 'GET' },
    { endpoint: '/api/employees/departments', method: 'GET' },
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(test.endpoint, test.method, test.data);
    if (success) passed++;
    console.log(''); // Add spacing
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);
