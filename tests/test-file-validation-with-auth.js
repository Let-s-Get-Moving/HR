/**
 * FILE VALIDATION TEST WITH AUTHENTICATION
 * Tests the actual file validation system with proper authentication
 */

const BASE_URL = 'https://hr-api-wbzs.onrender.com';
const fs = require('fs');
const path = require('path');

// Color logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  test: (msg) => console.log(`\x1b[35m[TEST]\x1b[0m ${msg}`)
};

let sessionId = null;

// Login to get session
async function login() {
  log.info('🔐 Logging in to get session...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Avneet',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    
    if (data.requiresMFA) {
      log.warn('⚠️ MFA is enabled - cannot proceed with automated test');
      log.warn('Please disable MFA temporarily or test manually');
      return false;
    }
    
    if (data.sessionId) {
      sessionId = data.sessionId;
      log.success(`✅ Logged in successfully (session: ${sessionId.substring(0, 10)}...)`);
      return true;
    } else {
      log.error(`❌ Login failed: ${data.error || 'Unknown error'}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Login error: ${error.message}`);
    return false;
  }
}

// Test 1: Valid Excel file upload
async function testValidExcelUpload() {
  log.test('TEST 1: Valid Excel file upload');
  
  try {
    // Create a minimal valid Excel file (ZIP-based)
    const validExcelContent = Buffer.from([
      0x50, 0x4B, 0x03, 0x04, // ZIP signature
      0x14, 0x00, 0x00, 0x00, // Version
      0x08, 0x00, // Flags
      0x00, 0x00, // Compression method
      0x00, 0x00, 0x00, 0x00, // Last mod time/date
      0x00, 0x00, 0x00, 0x00, // CRC32
      0x00, 0x00, 0x00, 0x00, // Compressed size
      0x00, 0x00, 0x00, 0x00, // Uncompressed size
      0x00, 0x00, // Filename length
      0x00, 0x00, // Extra field length
      // Add some content to make it look like a real Excel file
      ...Array(2000).fill(0x00) // Padding to make it > 1KB
    ]);
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('excel_file', validExcelContent, 'test-valid.xlsx');
    
    const response = await fetch(`${BASE_URL}/api/commissions/import`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-session-id': sessionId
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      log.success('✅ Valid Excel file - ACCEPTED (Expected)');
      return true;
    } else {
      log.error(`❌ Valid Excel file - REJECTED: ${data.error}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Valid Excel test failed: ${error.message}`);
    return false;
  }
}

// Test 2: Invalid Excel file (wrong signature)
async function testInvalidExcelUpload() {
  log.test('TEST 2: Invalid Excel file (wrong signature)');
  
  try {
    // Create a file with wrong signature (JPEG signature)
    const invalidExcelContent = Buffer.from([
      0xFF, 0xD8, 0xFF, // JPEG signature (wrong!)
      ...Array(2000).fill(0x00) // Padding
    ]);
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('excel_file', invalidExcelContent, 'test-invalid.xlsx');
    
    const response = await fetch(`${BASE_URL}/api/commissions/import`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-session-id': sessionId
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok && data.error && data.error.includes('validation')) {
      log.success('✅ Invalid Excel file - REJECTED (Expected)');
      return true;
    } else {
      log.error(`❌ Invalid Excel file - ACCEPTED: ${data.message || 'No error'}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Invalid Excel test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Empty file
async function testEmptyFileUpload() {
  log.test('TEST 3: Empty file upload');
  
  try {
    const emptyContent = Buffer.alloc(0);
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('excel_file', emptyContent, 'test-empty.xlsx');
    
    const response = await fetch(`${BASE_URL}/api/commissions/import`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-session-id': sessionId
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok && data.error) {
      log.success('✅ Empty file - REJECTED (Expected)');
      return true;
    } else {
      log.error(`❌ Empty file - ACCEPTED: ${data.message || 'No error'}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Empty file test failed: ${error.message}`);
    return false;
  }
}

// Test 4: Valid CSV file upload
async function testValidCSVUpload() {
  log.test('TEST 4: Valid CSV file upload');
  
  try {
    const validCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
Jane Smith,jane@example.com,Marketing,65000
Bob Johnson,bob@example.com,Sales,70000`;
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', validCSVContent, 'test-valid.csv');
    
    const response = await fetch(`${BASE_URL}/api/timecard-uploads/upload`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-session-id': sessionId
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      log.success('✅ Valid CSV file - ACCEPTED (Expected)');
      return true;
    } else {
      log.error(`❌ Valid CSV file - REJECTED: ${data.error}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Valid CSV test failed: ${error.message}`);
    return false;
  }
}

// Test 5: Malicious CSV file (SQL injection)
async function testMaliciousCSVUpload() {
  log.test('TEST 5: Malicious CSV file (SQL injection)');
  
  try {
    const maliciousCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
'; DROP TABLE employees; --,hacker@evil.com,IT,0
Jane Smith,jane@example.com,Marketing,65000`;
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', maliciousCSVContent, 'test-malicious.csv');
    
    const response = await fetch(`${BASE_URL}/api/timecard-uploads/upload`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-session-id': sessionId
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok && data.error && data.error.includes('validation')) {
      log.success('✅ Malicious CSV file - REJECTED (Expected)');
      return true;
    } else {
      log.error(`❌ Malicious CSV file - ACCEPTED: ${data.message || 'No error'}`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ Malicious CSV test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runFileValidationTests() {
  console.log('\n' + '='.repeat(80));
  log.info('FILE VALIDATION TEST WITH AUTHENTICATION');
  console.log('='.repeat(80) + '\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    log.error('❌ Cannot proceed without authentication');
    return;
  }
  
  console.log('\n' + '='.repeat(50));
  log.info('STARTING FILE VALIDATION TESTS');
  console.log('='.repeat(50) + '\n');
  
  const tests = [
    { name: 'Valid Excel file', fn: testValidExcelUpload },
    { name: 'Invalid Excel file', fn: testInvalidExcelUpload },
    { name: 'Empty file', fn: testEmptyFileUpload },
    { name: 'Valid CSV file', fn: testValidCSVUpload },
    { name: 'Malicious CSV file', fn: testMaliciousCSVUpload }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passed++;
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log.error(`❌ ${test.name} - ERROR: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  log.info('FILE VALIDATION TEST SUMMARY:');
  console.log('='.repeat(80));
  const percentage = Math.round((passed / total) * 100);
  console.log(`\n📊 Overall: ${passed}/${total} tests passed (${percentage}%)\n`);
  
  if (passed === total) {
    log.success('🎉 ALL FILE VALIDATION TESTS PASSED!');
    log.success('✅ File content validation is working correctly!');
  } else {
    log.error('⚠️ Some file validation tests failed.');
    log.error('Please check the logs above for details.');
  }
  
  return { passed, total, percentage };
}

// Run tests
runFileValidationTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
});
