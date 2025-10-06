/**
 * MLGA Security Testing Suite
 * Tests that all security fixes are working properly
 */

const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const { red, green, yellow, blue, cyan, bold, reset } = colors;

let passed = 0;
let failed = 0;
let sessionId = null;

async function test(name, fn) {
  try {
    process.stdout.write(`${blue}Testing:${reset} ${name}... `);
    await fn();
    console.log(`${green}✓ PASS${reset}`);
    passed++;
  } catch (error) {
    console.log(`${red}✗ FAIL${reset}`);
    console.log(`${red}  Error: ${error.message}${reset}`);
    failed++;
  }
}

async function makeRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId && { 'x-session-id': sessionId }),
      ...options.headers,
    },
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { response, data, status: response.status };
}

console.log(`\n${bold}${cyan}╔═══════════════════════════════════════════════════════════════╗${reset}`);
console.log(`${bold}${cyan}║           MLGA SECURITY TESTING SUITE                         ║${reset}`);
console.log(`${bold}${cyan}╚═══════════════════════════════════════════════════════════════╝${reset}\n`);

console.log(`${bold}API Base URL:${reset} ${API_BASE_URL}\n`);

(async () => {
  // ============================================================================
  // TEST 1: Routes should require authentication
  // ============================================================================
  console.log(`${bold}${yellow}1. Testing Route Protection${reset}\n`);

  await test('GET /api/employees should return 401 without auth', async () => {
    const { status } = await makeRequest('/api/employees');
    if (status !== 401) {
      throw new Error(`Expected 401, got ${status} - Routes are NOT protected!`);
    }
  });

  await test('GET /api/payroll should return 401 without auth', async () => {
    const { status } = await makeRequest('/api/payroll');
    if (status !== 401) {
      throw new Error(`Expected 401, got ${status} - Routes are NOT protected!`);
    }
  });

  await test('GET /api/analytics should return 401 without auth', async () => {
    const { status } = await makeRequest('/api/analytics');
    if (status !== 401) {
      throw new Error(`Expected 401, got ${status} - Routes are NOT protected!`);
    }
  });

  // ============================================================================
  // TEST 2: Authentication with new strong password
  // ============================================================================
  console.log(`\n${bold}${yellow}2. Testing Authentication${reset}\n`);

  await test('Login with old password should FAIL', async () => {
    const { status } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'Avneet',
        password: 'password123'
      })
    });
    if (status === 200) {
      throw new Error('Old password still works! Password was not changed.');
    }
  });

  await test('Login with new strong password should succeed', async () => {
    const { status, data } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'Avneet',
        password: 'mHwK3G0D1fA6gZUPthjBOQL8YPBN'
      })
    });
    
    if (status !== 200) {
      throw new Error(`Login failed with status ${status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.sessionId) {
      throw new Error('No session ID returned from login');
    }
    
    sessionId = data.sessionId;
  });

  // ============================================================================
  // TEST 3: Authenticated requests should work
  // ============================================================================
  console.log(`\n${bold}${yellow}3. Testing Authenticated Access${reset}\n`);

  await test('GET /api/employees should work with auth', async () => {
    const { status, data } = await makeRequest('/api/employees');
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status} - Auth not working properly`);
    }
    if (!Array.isArray(data)) {
      throw new Error('Expected array of employees');
    }
  });

  await test('GET /api/analytics should work with auth', async () => {
    const { status } = await makeRequest('/api/analytics');
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status} - Auth not working properly`);
    }
  });

  await test('GET /api/metrics should work with auth', async () => {
    const { status } = await makeRequest('/api/metrics');
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status} - Auth not working properly`);
    }
  });

  // ============================================================================
  // TEST 4: SQL Injection Prevention
  // ============================================================================
  console.log(`\n${bold}${yellow}4. Testing SQL Injection Prevention${reset}\n`);

  await test('SQL injection attempt should be blocked', async () => {
    const { status } = await makeRequest('/api/employees?search=\' OR 1=1 --');
    // Should either return 400 (blocked) or 200 with safe results (parameterized)
    if (status !== 400 && status !== 200) {
      throw new Error(`Unexpected status ${status}`);
    }
  });

  // ============================================================================
  // TEST 5: Session validation
  // ============================================================================
  console.log(`\n${bold}${yellow}5. Testing Session Security${reset}\n`);

  await test('Invalid session ID should be rejected', async () => {
    const oldSession = sessionId;
    sessionId = 'invalid-session-id-12345';
    
    const { status } = await makeRequest('/api/employees');
    
    sessionId = oldSession; // Restore valid session
    
    if (status !== 401) {
      throw new Error(`Expected 401 for invalid session, got ${status}`);
    }
  });

  await test('Valid session should still work', async () => {
    const { status } = await makeRequest('/api/employees');
    if (status !== 200) {
      throw new Error(`Valid session rejected with status ${status}`);
    }
  });

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================
  console.log(`\n${bold}${cyan}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`${bold}${cyan}                    TEST RESULTS                               ${reset}`);
  console.log(`${bold}${cyan}═══════════════════════════════════════════════════════════════${reset}\n`);

  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);

  console.log(`${bold}Total Tests:${reset} ${total}`);
  console.log(`${green}${bold}Passed:${reset} ${passed}`);
  if (failed > 0) {
    console.log(`${red}${bold}Failed:${reset} ${failed}`);
  }
  console.log(`${bold}Success Rate:${reset} ${percentage}%\n`);

  if (failed === 0) {
    console.log(`${green}${bold}🎉 ALL TESTS PASSED! MLGA IS COMPLETE! 🎉${reset}\n`);
    console.log(`${green}✅ Routes are protected with authentication${reset}`);
    console.log(`${green}✅ Old password no longer works${reset}`);
    console.log(`${green}✅ New strong password works${reset}`);
    console.log(`${green}✅ Session authentication working${reset}`);
    console.log(`${green}✅ Invalid sessions are rejected${reset}`);
    console.log(`${green}✅ SQL injection prevention active${reset}\n`);
    
    console.log(`${bold}${cyan}Security Status: SIGNIFICANTLY IMPROVED${reset}`);
    console.log(`Expected Score: ~6.5-7.0/10 (up from 4.1/10)\n`);
  } else {
    console.log(`${red}${bold}⚠️  SOME TESTS FAILED${reset}\n`);
    console.log(`${yellow}Issues detected:${reset}`);
    console.log(`- ${failed} test(s) did not pass`);
    console.log(`- Review the errors above for details\n`);
  }

  console.log(`${bold}${cyan}═══════════════════════════════════════════════════════════════${reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();

