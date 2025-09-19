#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'https://hr-api-wbzs.onrender.com';

async function testSecurity() {
  console.log('🔒 Testing Security Implementation on Render...\n');
  
  try {
    // Test 1: Basic API health
    console.log('1️⃣ Testing API health...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ API is healthy');
    } else {
      console.log('❌ API health check failed');
      return;
    }
    
    // Test 2: Test invalid login (should be rejected)
    console.log('\n2️⃣ Testing invalid login protection...');
    const invalidLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'hacker',
        password: 'wrongpassword'
      })
    });
    
    if (invalidLoginResponse.status === 401) {
      console.log('✅ Invalid login properly rejected');
    } else {
      console.log('❌ Invalid login not properly rejected');
    }
    
    // Test 3: Test SQL injection protection
    console.log('\n3️⃣ Testing SQL injection protection...');
    const sqlInjectionResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "'; DROP TABLE users; --",
        password: 'anything'
      })
    });
    
    if (sqlInjectionResponse.status === 401) {
      console.log('✅ SQL injection attempt properly rejected');
    } else {
      console.log('❌ SQL injection not properly rejected');
    }
    
    // Test 4: Test XSS protection
    console.log('\n4️⃣ Testing XSS protection...');
    const xssResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '<script>alert("xss")</script>',
        password: 'anything'
      })
    });
    
    if (xssResponse.status === 401) {
      console.log('✅ XSS attempt properly rejected');
    } else {
      console.log('❌ XSS not properly rejected');
    }
    
    // Test 5: Test valid login (if database is initialized)
    console.log('\n5️⃣ Testing valid login...');
    const validLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Avneet',
        password: 'password123'
      })
    });
    
    if (validLoginResponse.ok) {
      const loginData = await validLoginResponse.json();
      console.log('✅ Valid login successful');
      console.log(`   Session ID: ${loginData.sessionId?.substring(0, 8)}...`);
      console.log(`   User: ${loginData.user?.username}`);
      console.log(`   Role: ${loginData.user?.role}`);
      
      // Test 6: Test session validation
      console.log('\n6️⃣ Testing session validation...');
      const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, {
        headers: {
          'Cookie': `sessionId=${loginData.sessionId}`
        }
      });
      
      if (sessionResponse.ok) {
        console.log('✅ Session validation working');
      } else {
        console.log('❌ Session validation failed');
      }
      
    } else {
      console.log('❌ Valid login failed - database may not be initialized');
      console.log('   Run: npm run db:init-remote');
    }
    
    // Test 7: Test rate limiting
    console.log('\n7️⃣ Testing rate limiting...');
    let rateLimitHit = false;
    for (let i = 0; i < 10; i++) {
      const rateLimitResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          password: 'test'
        })
      });
      
      if (rateLimitResponse.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    
    if (rateLimitHit) {
      console.log('✅ Rate limiting working');
    } else {
      console.log('⚠️  Rate limiting not triggered (may need more requests)');
    }
    
    console.log('\n🎉 Security testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSecurity();
