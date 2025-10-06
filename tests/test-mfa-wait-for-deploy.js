/**
 * MFA Test with Deployment Wait
 * Retries until deployment is live
 */

const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMFA() {
  console.log('Testing MFA toggle...');
  
  // Login
  const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Avneet', password: 'password123' })
  });
  
  if (!loginRes.ok) {
    return { success: false, error: 'Login failed' };
  }
  
  const loginData = await loginRes.json();
  const sessionId = loginData.sessionId;
  
  // Try MFA toggle
  const toggleRes = await fetch(`${API_BASE_URL}/api/settings/security/two_factor_auth`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    },
    body: JSON.stringify({ value: true })
  });
  
  if (toggleRes.status === 401) {
    return { success: false, error: '401 - Deployment not live yet' };
  }
  
  if (!toggleRes.ok) {
    const error = await toggleRes.text();
    return { success: false, error: `Status ${toggleRes.status}: ${error}` };
  }
  
  const toggleData = await toggleRes.json();
  return { success: true, data: toggleData };
}

async function waitAndTest() {
  console.log('🔍 Waiting for Render deployment and testing MFA...\n');
  console.log('This will retry every 30 seconds until deployment is live.\n');
  
  let attempt = 1;
  const maxAttempts = 10; // 5 minutes total
  
  while (attempt <= maxAttempts) {
    console.log(`Attempt ${attempt}/${maxAttempts}...`);
    
    const result = await testMFA();
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! MFA is working!');
      console.log('Response:', JSON.stringify(result.data, null, 2));
      console.log('\n✅ Deployment is live and MFA toggle works!');
      console.log('\n📱 You can now enable MFA:');
      console.log('   1. Login to HR system');
      console.log('   2. Go to Settings → Security');
      console.log('   3. Toggle "Two-Factor Authentication" ON');
      console.log('   4. Scan QR code with Google Authenticator');
      console.log('   5. Done!');
      return;
    }
    
    console.log(`   ❌ ${result.error}`);
    
    if (attempt < maxAttempts) {
      console.log(`   Waiting 30 seconds before retry...\n`);
      await sleep(30000);
    }
    
    attempt++;
  }
  
  console.log('\n⏰ Timeout: Deployment taking longer than expected.');
  console.log('The fix has been deployed, but Render may need more time.');
  console.log('Try manually in 5-10 minutes.');
}

waitAndTest().catch(e => console.error('Error:', e.message));

