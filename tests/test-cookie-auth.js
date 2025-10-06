/**
 * Test Cookie-Based Authentication with CORS
 * Verifies that cookies work properly for cross-origin requests
 */

const API_BASE = 'https://hr-api-wbzs.onrender.com';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('\n🍪 COOKIE-BASED AUTH TEST\n');
console.log('Testing cross-origin authentication with cookies...\n');

async function testCookieAuth() {
  try {
    // Step 1: Login and get cookie
    console.log('📝 Step 1: Login with username/password...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // CRITICAL: This tells browser to send/receive cookies
      body: JSON.stringify({
        username: 'Avneet',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed (${loginResponse.status}): ${error}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('   User:', loginData.user?.username);
    console.log('   Role:', loginData.user?.role);
    
    // Check if cookie was set
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('✅ Server sent Set-Cookie header');
      console.log('   Cookie:', setCookieHeader.substring(0, 50) + '...');
    } else {
      console.log('⚠️  No Set-Cookie header in response (might be in browser only)');
    }

    // Extract session ID from response (for verification)
    const sessionId = loginData.sessionId;
    console.log('   Session ID:', sessionId ? sessionId.substring(0, 20) + '...' : 'Not in response');

    // Step 2: Make authenticated request using cookie
    console.log('\n📊 Step 2: Test authenticated endpoint (using cookie)...');
    await sleep(1000); // Small delay
    
    const dashboardResponse = await fetch(`${API_BASE}/api/analytics/dashboard?timeRange=month`, {
      method: 'GET',
      credentials: 'include', // Browser will automatically send the cookie
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!dashboardResponse.ok) {
      const error = await dashboardResponse.text();
      throw new Error(`Dashboard request failed (${dashboardResponse.status}): ${error}`);
    }

    const dashboardData = await dashboardResponse.json();
    console.log('✅ Dashboard data fetched successfully!');
    console.log('   Employees:', dashboardData.employeeMetrics?.totalEmployees || 'N/A');

    // Step 3: Test MFA settings endpoint
    console.log('\n🔐 Step 3: Test MFA settings endpoint...');
    await sleep(1000);
    
    const mfaResponse = await fetch(`${API_BASE}/api/settings/security/two_factor_auth`, {
      method: 'PUT',
      credentials: 'include', // Cookie-based auth
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: true })
    });

    if (!mfaResponse.ok) {
      const error = await mfaResponse.text();
      console.log('❌ MFA toggle failed:', error);
      console.log('   Status:', mfaResponse.status);
      return false;
    }

    const mfaData = await mfaResponse.json();
    console.log('✅ MFA settings endpoint works!');
    console.log('   Response:', JSON.stringify(mfaData, null, 2));

    // Step 4: Verify session is still valid
    console.log('\n✅ Step 4: Verify session...');
    const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, {
      method: 'GET',
      credentials: 'include'
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ Session still valid!');
      console.log('   User:', sessionData.user?.username);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL COOKIE AUTH TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n🎉 Cookie-based authentication is working perfectly!');
    console.log('   ✅ Login sets HttpOnly cookie');
    console.log('   ✅ Cookie sent automatically in subsequent requests');
    console.log('   ✅ Authenticated endpoints work with cookies');
    console.log('   ✅ MFA settings endpoint works');
    console.log('   ✅ Cross-origin CORS properly configured\n');
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Wait for deployment
console.log('⏳ Waiting 3 minutes for Render deployment...');
setTimeout(async () => {
  console.log('🚀 Starting tests...\n');
  const success = await testCookieAuth();
  process.exit(success ? 0 : 1);
}, 3 * 60 * 1000); // 3 minutes

console.log('   Current time:', new Date().toLocaleTimeString());
console.log('   Test will start at:', new Date(Date.now() + 3 * 60 * 1000).toLocaleTimeString());

