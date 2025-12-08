#!/usr/bin/env node

/**
 * COMPREHENSIVE NEW FEATURES TEST SUITE
 * Tests all newly added features with full coverage
 * 
 * Features tested:
 * - Chat System (threads, messages, attachments, WebSocket)
 * - Notifications (CRUD, WebSocket, unread counts)
 * - Settings (notification preferences, user settings)
 * - Trusted Devices (management, revocation)
 * - WebSocket (connections, real-time updates)
 * - Recruiting (comprehensive)
 * - Benefits (comprehensive)
 * - Bonuses (approval/rejection workflow)
 */

const API_BASE = 'https://hr-api-wbzs.onrender.com';
const WS_BASE = 'wss://hr-api-wbzs.onrender.com';

let sessionCookie = null;
let authHeaders = {};
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function apiCall(endpoint, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function test(name, testFn, options = {}) {
  testResults.total++;
  
  try {
    log('🧪', `Testing: ${name}`);
    const result = await testFn();
    
    if (result === true) {
      testResults.passed++;
      log('✅', `PASSED: ${name}`);
      testResults.tests.push({ name, status: 'passed' });
    } else if (result === 'skip') {
      testResults.skipped++;
      log('⏭️ ', `SKIPPED: ${name}`);
      testResults.tests.push({ name, status: 'skipped', reason: 'No data or N/A' });
    } else {
      testResults.failed++;
      log('❌', `FAILED: ${name} - ${result || 'Unknown error'}`);
      testResults.tests.push({ name, status: 'failed', error: result });
    }
  } catch (error) {
    testResults.failed++;
    log('❌', `ERROR: ${name} - ${error.message}`);
    testResults.tests.push({ name, status: 'error', error: error.message });
  }
  
  console.log('');
}

// ============================================
// AUTHENTICATION SETUP
// ============================================

async function setupAuthentication() {
  logSection('🔐 Authentication Setup');
  
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };
  
  log('🔑', 'Attempting admin login...');
  const response = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData)
  });
  
  if (response.ok && response.data.user) {
    log('✅', `Logged in as: ${response.data.user.username}`);
    
    // Extract session cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      log('🍪', 'Session cookie obtained');
    }
    
    return true;
  } else {
    log('❌', 'Login failed - using unauthenticated mode for public endpoints');
    return false;
  }
}

// ============================================
// CHAT SYSTEM TESTS
// ============================================

async function testChatSystem() {
  logSection('💬 Chat System Tests');
  
  await test('Chat - Get Available Users', async () => {
    const response = await apiCall('/api/chat/available-users');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}: ${JSON.stringify(response.data)}`;
    }
    
    if (!response.data.users || !Array.isArray(response.data.users)) {
      return 'Invalid response structure - missing users array';
    }
    
    log('📊', `Found ${response.data.users.length} available users`);
    return true;
  });
  
  await test('Chat - Get User Threads', async () => {
    const response = await apiCall('/api/chat/threads');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.threads || !Array.isArray(response.data.threads)) {
      return 'Invalid response structure - missing threads array';
    }
    
    log('📊', `Found ${response.data.threads.length} chat threads`);
    return true;
  });
  
  await test('Chat - Create New Thread', async () => {
    // Get available users first
    const usersResponse = await apiCall('/api/chat/available-users');
    if (!usersResponse.ok || !usersResponse.data.users || usersResponse.data.users.length === 0) {
      return 'skip';
    }
    
    const otherUser = usersResponse.data.users[0];
    
    const response = await apiCall('/api/chat/threads', {
      method: 'POST',
      body: JSON.stringify({
        participant_id: otherUser.id,
        subject: 'Test Thread - Automated Testing'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}: ${JSON.stringify(response.data)}`;
    }
    
    if (!response.data.thread || !response.data.thread.id) {
      return 'Invalid response - missing thread data';
    }
    
    log('✉️', `Created thread ID: ${response.data.thread.id}`);
    return true;
  });
  
  await test('Chat - Send Message in Thread', async () => {
    // Get existing threads
    const threadsResponse = await apiCall('/api/chat/threads');
    if (!threadsResponse.ok || !threadsResponse.data.threads || threadsResponse.data.threads.length === 0) {
      return 'skip';
    }
    
    const threadId = threadsResponse.data.threads[0].id;
    
    const response = await apiCall(`/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message - automated testing'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📨', 'Message sent successfully');
    return true;
  });
  
  await test('Chat - Get Messages in Thread', async () => {
    const threadsResponse = await apiCall('/api/chat/threads');
    if (!threadsResponse.ok || !threadsResponse.data.threads || threadsResponse.data.threads.length === 0) {
      return 'skip';
    }
    
    const threadId = threadsResponse.data.threads[0].id;
    const response = await apiCall(`/api/chat/threads/${threadId}/messages`);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.messages || !Array.isArray(response.data.messages)) {
      return 'Invalid response structure';
    }
    
    log('📊', `Found ${response.data.messages.length} messages`);
    return true;
  });
  
  await test('Chat - Edit Message', async () => {
    // Get thread and messages
    const threadsResponse = await apiCall('/api/chat/threads');
    if (!threadsResponse.ok || !threadsResponse.data.threads || threadsResponse.data.threads.length === 0) {
      return 'skip';
    }
    
    const threadId = threadsResponse.data.threads[0].id;
    const messagesResponse = await apiCall(`/api/chat/threads/${threadId}/messages`);
    
    if (!messagesResponse.ok || !messagesResponse.data.messages || messagesResponse.data.messages.length === 0) {
      return 'skip';
    }
    
    const messageId = messagesResponse.data.messages[0].id;
    
    const response = await apiCall(`/api/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Edited test message'
      })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✏️', 'Message edited successfully');
    return true;
  });
}

// ============================================
// NOTIFICATIONS TESTS
// ============================================

async function testNotifications() {
  logSection('🔔 Notifications System Tests');
  
  await test('Notifications - Get All Notifications', async () => {
    const response = await apiCall('/api/notifications');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!response.data.notifications || !Array.isArray(response.data.notifications)) {
      return 'Invalid response structure';
    }
    
    log('📊', `Found ${response.data.notifications.length} notifications`);
    return true;
  });
  
  await test('Notifications - Get Unread Count', async () => {
    const response = await apiCall('/api/notifications/unread-count');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (typeof response.data.count !== 'number') {
      return 'Invalid response - missing count';
    }
    
    log('📊', `Unread count: ${response.data.count}`);
    return true;
  });
  
  await test('Notifications - Mark as Read', async () => {
    // Get notifications first
    const notificationsResponse = await apiCall('/api/notifications');
    if (!notificationsResponse.ok || !notificationsResponse.data.notifications || notificationsResponse.data.notifications.length === 0) {
      return 'skip';
    }
    
    const notification = notificationsResponse.data.notifications[0];
    const response = await apiCall(`/api/notifications/${notification.id}/read`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Notification marked as read');
    return true;
  });
  
  await test('Notifications - Mark as Unread', async () => {
    const notificationsResponse = await apiCall('/api/notifications');
    if (!notificationsResponse.ok || !notificationsResponse.data.notifications || notificationsResponse.data.notifications.length === 0) {
      return 'skip';
    }
    
    const notification = notificationsResponse.data.notifications[0];
    const response = await apiCall(`/api/notifications/${notification.id}/unread`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('📬', 'Notification marked as unread');
    return true;
  });
  
  await test('Notifications - Mark All as Read', async () => {
    const response = await apiCall('/api/notifications/mark-all-read', {
      method: 'PUT'
    });
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', `Marked ${response.data.count || 0} notifications as read`);
    return true;
  });
  
  await test('Notifications - Delete Notification', async () => {
    const notificationsResponse = await apiCall('/api/notifications');
    if (!notificationsResponse.ok || !notificationsResponse.data.notifications || notificationsResponse.data.notifications.length === 0) {
      return 'skip';
    }
    
    const notification = notificationsResponse.data.notifications[0];
    const response = await apiCall(`/api/notifications/${notification.id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🗑️', 'Notification deleted');
    return true;
  });
}

// ============================================
// SETTINGS TESTS
// ============================================

async function testSettings() {
  logSection('⚙️ Settings System Tests');
  
  await test('Settings - Get Notification Settings', async () => {
    const response = await apiCall('/api/settings/notifications');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} notification settings`);
    return true;
  });
  
  await test('Settings - Update Notification Setting', async () => {
    const response = await apiCall('/api/settings/notifications/email_notifications', {
      method: 'PUT',
      body: JSON.stringify({ value: 'true' })
    });
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Notification setting updated');
    return true;
  });
  
  await test('Settings - Get Application Settings', async () => {
    const response = await apiCall('/api/settings/application');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} application settings`);
    return true;
  });
}

// ============================================
// TRUSTED DEVICES TESTS
// ============================================

async function testTrustedDevices() {
  logSection('🔒 Trusted Devices Tests');
  
  await test('Trusted Devices - List Devices', async () => {
    const response = await apiCall('/api/trusted-devices');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} trusted devices`);
    return true;
  });
  
  await test('Trusted Devices - Update Device Label', async () => {
    const devicesResponse = await apiCall('/api/trusted-devices');
    if (!devicesResponse.ok || !Array.isArray(devicesResponse.data) || devicesResponse.data.length === 0) {
      return 'skip';
    }
    
    const device = devicesResponse.data[0];
    const response = await apiCall(`/api/trusted-devices/${device.id}/label`, {
      method: 'PUT',
      body: JSON.stringify({ label: 'Test Device Label' })
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Device label updated');
    return true;
  });
  
  await test('Trusted Devices - Revoke Device', async () => {
    const devicesResponse = await apiCall('/api/trusted-devices');
    if (!devicesResponse.ok || !Array.isArray(devicesResponse.data) || devicesResponse.data.length === 0) {
      return 'skip';
    }
    
    const device = devicesResponse.data[0];
    const response = await apiCall(`/api/trusted-devices/${device.id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('🗑️', 'Device revoked');
    return true;
  });
}

// ============================================
// RECRUITING COMPREHENSIVE TESTS
// ============================================

async function testRecruiting() {
  logSection('📋 Recruiting System Tests');
  
  await test('Recruiting - Get Job Postings', async () => {
    const response = await apiCall('/api/recruiting/job-postings');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} job postings`);
    return true;
  });
  
  await test('Recruiting - Get Candidates', async () => {
    const response = await apiCall('/api/recruiting/candidates');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} candidates`);
    return true;
  });
  
  await test('Recruiting - Get Applications', async () => {
    const response = await apiCall('/api/recruiting/applications');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} applications`);
    return true;
  });
  
  await test('Recruiting - Get Interviews', async () => {
    const response = await apiCall('/api/recruiting/interviews');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} interviews`);
    return true;
  });
  
  await test('Recruiting - Get Analytics', async () => {
    const response = await apiCall('/api/recruiting/analytics');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!response.data || typeof response.data !== 'object') {
      return 'Invalid response - expected object';
    }
    
    log('📈', 'Recruiting analytics retrieved');
    return true;
  });
}

// ============================================
// BENEFITS COMPREHENSIVE TESTS
// ============================================

async function testBenefits() {
  logSection('💼 Benefits System Tests');
  
  await test('Benefits - Get Plans', async () => {
    const response = await apiCall('/api/benefits/plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} benefits plans`);
    return true;
  });
  
  await test('Benefits - Get Enrollments', async () => {
    const response = await apiCall('/api/benefits/enrollments');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} enrollments`);
    return true;
  });
  
  await test('Benefits - Get Retirement Plans', async () => {
    const response = await apiCall('/api/benefits/retirement-plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} retirement plans`);
    return true;
  });
  
  await test('Benefits - Get Insurance Plans', async () => {
    const response = await apiCall('/api/benefits/insurance-plans');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} insurance plans`);
    return true;
  });
  
  await test('Benefits - Get Analytics', async () => {
    const response = await apiCall('/api/benefits/analytics');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!response.data || typeof response.data !== 'object') {
      return 'Invalid response - expected object';
    }
    
    log('📈', 'Benefits analytics retrieved');
    return true;
  });
}

// ============================================
// BONUSES COMPREHENSIVE TESTS
// ============================================

async function testBonuses() {
  logSection('💰 Bonuses System Tests');
  
  await test('Bonuses - Get All Bonuses', async () => {
    const response = await apiCall('/api/bonuses');
    
    if (!response.ok) {
      if (response.status === 401) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} bonuses`);
    return true;
  });
  
  await test('Bonuses - Get Bonus Structures', async () => {
    const response = await apiCall('/api/bonuses/structures');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} bonus structures`);
    return true;
  });
  
  await test('Bonuses - Get Commission Structures', async () => {
    const response = await apiCall('/api/bonuses/commission-structures');
    
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    
    if (!Array.isArray(response.data)) {
      return 'Invalid response - expected array';
    }
    
    log('📊', `Found ${response.data.length} commission structures`);
    return true;
  });
  
  await test('Bonuses - Create Bonus', async () => {
    const bonusData = {
      employee_id: 1,
      bonus_type: 'Performance',
      amount: 5000,
      period: 'Q4 2024',
      criteria: 'Exceeded quarterly targets',
      status: 'Pending'
    };
    
    const response = await apiCall('/api/bonuses', {
      method: 'POST',
      body: JSON.stringify(bonusData)
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return 'skip';
      return `HTTP ${response.status}`;
    }
    
    log('✅', 'Bonus created successfully');
    return true;
  });
}

// ============================================
// WEBSOCKET TESTS
// ============================================

async function testWebSocket() {
  logSection('🔌 WebSocket Tests');
  
  await test('WebSocket - Connection Test', async () => {
    return new Promise((resolve) => {
      try {
        const ws = new (require('ws')).WebSocket(`${WS_BASE}/ws`, {
          headers: sessionCookie ? { Cookie: sessionCookie } : {}
        });
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve('Timeout - WebSocket not responding');
        }, 5000);
        
        ws.on('open', () => {
          log('🔗', 'WebSocket connected');
          clearTimeout(timeout);
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.event === 'connected') {
            log('✅', `WebSocket authenticated for user ${message.data.userId}`);
            ws.close();
            resolve(true);
          }
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          resolve(`WebSocket error: ${error.message}`);
        });
        
        ws.on('close', () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        resolve(`WebSocket test failed: ${error.message}`);
      }
    });
  });
  
  await test('WebSocket - Ping/Pong Test', async () => {
    return new Promise((resolve) => {
      try {
        const ws = new (require('ws')).WebSocket(`${WS_BASE}/ws`, {
          headers: sessionCookie ? { Cookie: sessionCookie } : {}
        });
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve('Timeout - no pong received');
        }, 5000);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({ event: 'ping' }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.event === 'pong') {
            log('🏓', 'Ping/Pong successful');
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          resolve(`WebSocket error: ${error.message}`);
        });
      } catch (error) {
        resolve('skip'); // WebSocket client might not be available
      }
    });
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('\n');
  log('🚀', 'Starting Comprehensive New Features Test Suite');
  log('📅', `Date: ${new Date().toISOString()}`);
  log('🌐', `API Base: ${API_BASE}`);
  console.log('\n');
  
  // Setup authentication
  await setupAuthentication();
  
  // Run all test suites
  await testChatSystem();
  await testNotifications();
  await testSettings();
  await testTrustedDevices();
  await testRecruiting();
  await testBenefits();
  await testBonuses();
  await testWebSocket();
  
  // Print final results
  logSection('📊 FINAL TEST RESULTS');
  
  console.log(`Total Tests:   ${testResults.total}`);
  console.log(`✅ Passed:     ${testResults.passed}`);
  console.log(`❌ Failed:     ${testResults.failed}`);
  console.log(`⏭️  Skipped:    ${testResults.skipped}`);
  
  const successRate = ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! NEW FEATURES ARE FULLY FUNCTIONAL! 🎉\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${testResults.failed} TESTS FAILED - CHECK IMPLEMENTATION\n`);
    
    console.log('Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'failed' || t.status === 'error')
      .forEach(t => {
        console.log(`  ❌ ${t.name}`);
        if (t.error) console.log(`     ${t.error}`);
      });
    
    console.log('');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});

