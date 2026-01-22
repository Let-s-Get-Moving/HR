#!/usr/bin/env node

/**
 * Test: Terminated Employee Authentication Blocking
 * 
 * Verifies that:
 * 1. Terminated employees cannot log in (expect 401)
 * 2. On Leave employees can log in (expect 200)
 * 3. Existing sessions become invalid after employee status changes to Terminated (expect 401)
 * 4. System/admin users without employee_id can still log in
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr_user:hr_password@localhost:5432/hr_database',
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

const API_BASE = process.env.API_URL || 'http://localhost:8080';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test data
const TEST_PASSWORD = 'testpass123';
let testEmployeeId = null;
let testUserId = null;
let testSessionId = null;

async function setup() {
  console.log('\n📦 Setting up test data...\n');
  
  const client = await pool.connect();
  try {
    // Create a test employee with Active status
    const employeeResult = await client.query(`
      INSERT INTO employees (first_name, last_name, email, hire_date, employment_type, status)
      VALUES ('TestAuth', 'Employee', 'testauth@example.com', CURRENT_DATE, 'Full-time', 'Active')
      RETURNING id
    `);
    testEmployeeId = employeeResult.rows[0].id;
    console.log(`✅ Created test employee ID: ${testEmployeeId}`);
    
    // Get user role_id
    const roleResult = await client.query(`SELECT id FROM hr_roles WHERE role_name = 'user' LIMIT 1`);
    const roleId = roleResult.rows[0]?.id || 1;
    
    // Create user account linked to this employee
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const userResult = await client.query(`
      INSERT INTO users (username, email, full_name, password_hash, role_id, employee_id, is_active)
      VALUES ('TestAuthUser', 'testauth@example.com', 'TestAuth Employee', $1, $2, $3, true)
      RETURNING id
    `, [passwordHash, roleId, testEmployeeId]);
    testUserId = userResult.rows[0].id;
    console.log(`✅ Created test user ID: ${testUserId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');
  
  const client = await pool.connect();
  try {
    // Delete test session if exists
    if (testSessionId) {
      await client.query('DELETE FROM user_sessions WHERE id = $1', [testSessionId]);
    }
    
    // Delete test user
    if (testUserId) {
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log(`✅ Deleted test user ID: ${testUserId}`);
    }
    
    // Delete test employee
    if (testEmployeeId) {
      await client.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
      console.log(`✅ Deleted test employee ID: ${testEmployeeId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

async function setEmployeeStatus(status) {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE employees SET status = $1 WHERE id = $2',
      [status, testEmployeeId]
    );
    console.log(`   📝 Set employee status to: ${status}`);
  } finally {
    client.release();
  }
}

async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function checkSession(sessionId) {
  const response = await fetch(`${API_BASE}/api/auth/session`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    }
  });
  
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function testActiveEmployeeCanLogin() {
  console.log('\n🧪 Test 1: Active employee can log in');
  console.log('   Expected: 200 (success)\n');
  
  await setEmployeeStatus('Active');
  
  const result = await login('TestAuthUser', TEST_PASSWORD);
  
  if (result.status === 200) {
    testSessionId = result.data.sessionId;
    console.log(`   ✅ PASS: Login succeeded (status ${result.status})`);
    console.log(`   📝 Got session ID: ${testSessionId?.substring(0, 20)}...`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 200, got ${result.status}`);
    console.log(`   📝 Error: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testOnLeaveEmployeeCanLogin() {
  console.log('\n🧪 Test 2: On Leave employee can log in');
  console.log('   Expected: 200 (success)\n');
  
  await setEmployeeStatus('On Leave');
  
  const result = await login('TestAuthUser', TEST_PASSWORD);
  
  if (result.status === 200) {
    console.log(`   ✅ PASS: Login succeeded (status ${result.status})`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 200, got ${result.status}`);
    console.log(`   📝 Error: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testTerminatedEmployeeCannotLogin() {
  console.log('\n🧪 Test 3: Terminated employee cannot log in');
  console.log('   Expected: 401 (unauthorized)\n');
  
  await setEmployeeStatus('Terminated');
  
  const result = await login('TestAuthUser', TEST_PASSWORD);
  
  if (result.status === 401) {
    console.log(`   ✅ PASS: Login denied (status ${result.status})`);
    console.log(`   📝 Error message: ${result.data.error}`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 401, got ${result.status}`);
    console.log(`   📝 Response: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testExistingSessionInvalidAfterTermination() {
  console.log('\n🧪 Test 4: Existing session becomes invalid after termination');
  console.log('   Expected: 401 when checking session after status change to Terminated\n');
  
  // First, set to Active and login to get a session
  await setEmployeeStatus('Active');
  
  const loginResult = await login('TestAuthUser', TEST_PASSWORD);
  if (loginResult.status !== 200) {
    console.log(`   ❌ FAIL: Could not login to get session`);
    return false;
  }
  
  const sessionId = loginResult.data.sessionId;
  console.log(`   📝 Got session ID: ${sessionId?.substring(0, 20)}...`);
  
  // Verify session works while active
  const preCheck = await checkSession(sessionId);
  if (preCheck.status !== 200) {
    console.log(`   ❌ FAIL: Session should work while employee is Active`);
    return false;
  }
  console.log(`   ✅ Session valid while Active`);
  
  // Now terminate the employee
  await setEmployeeStatus('Terminated');
  console.log(`   📝 Employee terminated, checking if session is invalidated...`);
  
  // Small delay to ensure DB update is committed
  await sleep(100);
  
  // Check session again - should fail
  const postCheck = await checkSession(sessionId);
  
  if (postCheck.status === 401) {
    console.log(`   ✅ PASS: Session invalidated (status ${postCheck.status})`);
    console.log(`   📝 Error: ${postCheck.data.error}`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 401, got ${postCheck.status}`);
    console.log(`   📝 Session should have been invalidated but wasn't`);
    return false;
  }
}

async function testSystemUserWithoutEmployeeCanLogin() {
  console.log('\n🧪 Test 5: System user without employee_id can log in');
  console.log('   Expected: 200 (admin/system users should work)\n');
  
  // Use the default admin user (Avneet) which has no employee_id
  const result = await login('Avneet', 'password123');
  
  if (result.status === 200) {
    console.log(`   ✅ PASS: Admin login succeeded (status ${result.status})`);
    console.log(`   📝 User: ${result.data.user?.username}`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 200, got ${result.status}`);
    console.log(`   📝 Error: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 TERMINATED EMPLOYEE AUTHENTICATION BLOCKING TESTS');
  console.log('='.repeat(70));
  console.log(`\nAPI Base: ${API_BASE}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Remote' : 'Local'}`);
  
  const setupOk = await setup();
  if (!setupOk) {
    console.log('\n❌ Setup failed, aborting tests');
    await cleanup();
    process.exit(1);
  }
  
  const results = [];
  
  try {
    results.push(await testActiveEmployeeCanLogin());
    results.push(await testOnLeaveEmployeeCanLogin());
    results.push(await testTerminatedEmployeeCannotLogin());
    results.push(await testExistingSessionInvalidAfterTermination());
    results.push(await testSystemUserWithoutEmployeeCanLogin());
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    results.push(false);
  }
  
  await cleanup();
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 TEST RESULTS: ${passed}/${total} passed`);
  console.log('='.repeat(70));
  
  if (passed === total) {
    console.log('\n✅ ALL TESTS PASSED');
    console.log('   ✅ Active employees can log in');
    console.log('   ✅ On Leave employees can log in');
    console.log('   ✅ Terminated employees cannot log in');
    console.log('   ✅ Existing sessions invalidated on termination');
    console.log('   ✅ System users without employee_id can log in\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('   Review the output above for details.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  cleanup().finally(() => process.exit(1));
});
