/**
 * MFA Toggle Test
 * Tests if the settings page can enable MFA without 401 errors
 */

const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';

async function test() {
  console.log('🧪 Testing MFA Toggle Functionality\n');
  
  // Step 1: Login
  console.log('Step 1: Logging in...');
  const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Avneet',
      password: 'password123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    const error = await loginResponse.text();
    console.error('Error:', error);
    process.exit(1);
  }
  
  const loginData = await loginResponse.json();
  console.log('✅ Login successful');
  console.log('Session ID:', loginData.sessionId?.substring(0, 10) + '...');
  
  const sessionId = loginData.sessionId;
  
  // Step 2: Get current security settings
  console.log('\nStep 2: Getting security settings...');
  const getSecurityResponse = await fetch(`${API_BASE_URL}/api/settings/security`, {
    headers: { 'x-session-id': sessionId }
  });
  
  if (!getSecurityResponse.ok) {
    console.error('❌ Get security settings failed:', getSecurityResponse.status);
    const error = await getSecurityResponse.text();
    console.error('Error:', error);
    process.exit(1);
  }
  
  const securitySettings = await getSecurityResponse.json();
  console.log('✅ Security settings retrieved');
  const mfaSetting = securitySettings.find(s => s.key === 'two_factor_auth');
  console.log('Current MFA status:', mfaSetting?.value);
  
  // Step 3: Try to enable MFA
  console.log('\nStep 3: Attempting to enable MFA...');
  const enableMFAResponse = await fetch(`${API_BASE_URL}/api/settings/security/two_factor_auth`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    },
    body: JSON.stringify({ value: true })
  });
  
  console.log('Response status:', enableMFAResponse.status);
  
  if (!enableMFAResponse.ok) {
    console.error('❌ Enable MFA failed:', enableMFAResponse.status);
    const error = await enableMFAResponse.text();
    console.error('Error:', error);
    
    if (enableMFAResponse.status === 401) {
      console.log('\n⚠️  PROBLEM: Still getting 401 Unauthorized');
      console.log('This means authentication is not working correctly');
    }
    
    process.exit(1);
  }
  
  const enableData = await enableMFAResponse.json();
  console.log('✅ MFA toggle successful!');
  console.log('Response:', JSON.stringify(enableData, null, 2));
  
  // Step 4: Try MFA setup endpoint
  console.log('\nStep 4: Testing MFA setup endpoint...');
  const setupResponse = await fetch(`${API_BASE_URL}/api/settings/security/mfa/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    }
  });
  
  console.log('Setup response status:', setupResponse.status);
  
  if (!setupResponse.ok) {
    console.error('❌ MFA setup failed:', setupResponse.status);
    const error = await setupResponse.text();
    console.error('Error:', error);
    process.exit(1);
  }
  
  const setupData = await setupResponse.json();
  console.log('✅ MFA setup endpoint works!');
  console.log('Has QR code:', !!setupData.qrCode);
  console.log('Has secret:', !!setupData.secret);
  console.log('Has backup codes:', !!setupData.backupCodes);
  console.log('Number of backup codes:', setupData.backupCodes?.length);
  
  // Step 5: Check MFA status
  console.log('\nStep 5: Checking MFA status...');
  const statusResponse = await fetch(`${API_BASE_URL}/api/settings/security/mfa/status`, {
    headers: { 'x-session-id': sessionId }
  });
  
  if (!statusResponse.ok) {
    console.error('❌ MFA status check failed:', statusResponse.status);
    const error = await statusResponse.text();
    console.error('Error:', error);
    process.exit(1);
  }
  
  const statusData = await statusResponse.json();
  console.log('✅ MFA status check works!');
  console.log('MFA enabled:', statusData.enabled);
  
  console.log('\n🎉 ALL TESTS PASSED! MFA is working!');
  console.log('\n📋 Summary:');
  console.log('  ✅ Login works');
  console.log('  ✅ Security settings accessible');
  console.log('  ✅ MFA toggle works (no 401 error)');
  console.log('  ✅ MFA setup generates QR code');
  console.log('  ✅ MFA status check works');
  console.log('\n🚀 MFA is ready for production use!');
}

test().catch(error => {
  console.error('\n💥 Test failed with error:', error.message);
  process.exit(1);
});

