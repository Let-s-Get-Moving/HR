#!/usr/bin/env node

/**
 * API ENDPOINT COVERAGE TEST
 * Validates that all API endpoints are accessible and return expected responses
 * 
 * This test systematically checks every known endpoint in the system
 */

const API_BASE = 'https://hr-api-wbzs.onrender.com';

const results = {
  total: 0,
  accessible: 0,
  authenticated: 0,
  missing: 0,
  error: 0,
  endpoints: []
};

let sessionCookie = null;

// ============================================
// ALL KNOWN API ENDPOINTS
// ============================================

const ENDPOINTS = {
  // Authentication
  auth: [
    { method: 'POST', path: '/api/auth/login', requiresAuth: false },
    { method: 'POST', path: '/api/auth/logout', requiresAuth: true },
    { method: 'GET', path: '/api/auth/session', requiresAuth: true },
    { method: 'POST', path: '/api/auth/setup-mfa', requiresAuth: true },
    { method: 'POST', path: '/api/auth/verify-mfa', requiresAuth: false },
  ],
  
  // Employees
  employees: [
    { method: 'GET', path: '/api/employees', requiresAuth: true },
    { method: 'GET', path: '/api/employees/:id', requiresAuth: true },
    { method: 'POST', path: '/api/employees', requiresAuth: true },
    { method: 'PUT', path: '/api/employees/:id', requiresAuth: true },
    { method: 'DELETE', path: '/api/employees/:id', requiresAuth: true },
    { method: 'GET', path: '/api/employees/departments', requiresAuth: true },
  ],
  
  // Chat (DM + Group Chats + Telegram-style features)
  chat: [
    { method: 'GET', path: '/api/chat/available-users', requiresAuth: true },
    { method: 'GET', path: '/api/chat/threads', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads', requiresAuth: true },
    { method: 'GET', path: '/api/chat/threads/:id', requiresAuth: true },
    { method: 'PUT', path: '/api/chat/threads/:id', requiresAuth: true },
    { method: 'GET', path: '/api/chat/threads/:id/members', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads/:id/members', requiresAuth: true },
    { method: 'DELETE', path: '/api/chat/threads/:id/members/:userId', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads/:id/pin', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads/:id/unpin', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads/:id/hide', requiresAuth: true },
    { method: 'GET', path: '/api/chat/threads/:id/messages', requiresAuth: true },
    { method: 'POST', path: '/api/chat/threads/:id/messages', requiresAuth: true },
    { method: 'PUT', path: '/api/chat/messages/:id', requiresAuth: true },
    { method: 'DELETE', path: '/api/chat/messages/:id', requiresAuth: true },
    { method: 'POST', path: '/api/chat/messages/:id/delete-for-me', requiresAuth: true },
    { method: 'POST', path: '/api/chat/messages/:id/attachments', requiresAuth: true },
    { method: 'GET', path: '/api/chat/attachments/:id', requiresAuth: true },
  ],
  
  // Notifications
  notifications: [
    { method: 'GET', path: '/api/notifications', requiresAuth: true },
    { method: 'GET', path: '/api/notifications/unread-count', requiresAuth: true },
    { method: 'PUT', path: '/api/notifications/:id/read', requiresAuth: true },
    { method: 'PUT', path: '/api/notifications/:id/unread', requiresAuth: true },
    { method: 'PUT', path: '/api/notifications/mark-all-read', requiresAuth: true },
    { method: 'DELETE', path: '/api/notifications/:id', requiresAuth: true },
  ],
  
  // Settings
  settings: [
    { method: 'GET', path: '/api/settings/notifications', requiresAuth: false },
    { method: 'PUT', path: '/api/settings/notifications/:key', requiresAuth: true },
    { method: 'GET', path: '/api/settings/application', requiresAuth: false },
    { method: 'PUT', path: '/api/settings/application/:key', requiresAuth: true },
  ],
  
  // Trusted Devices
  trustedDevices: [
    { method: 'GET', path: '/api/trusted-devices', requiresAuth: true },
    { method: 'DELETE', path: '/api/trusted-devices/:id', requiresAuth: true },
    { method: 'POST', path: '/api/trusted-devices/revoke-all', requiresAuth: true },
    { method: 'PUT', path: '/api/trusted-devices/:id/label', requiresAuth: true },
    { method: 'POST', path: '/api/trusted-devices/cleanup', requiresAuth: false },
  ],
  
  // Leave Management
  leave: [
    { method: 'GET', path: '/api/leave/requests', requiresAuth: false },
    { method: 'POST', path: '/api/leave/requests', requiresAuth: true },
    { method: 'GET', path: '/api/leave/analytics', requiresAuth: false },
    { method: 'GET', path: '/api/leave/types', requiresAuth: false },
  ],
  
  // Performance
  performance: [
    { method: 'GET', path: '/api/performance/reviews', requiresAuth: false },
    { method: 'GET', path: '/api/performance/goals', requiresAuth: false },
    { method: 'POST', path: '/api/performance/goals', requiresAuth: true },
    { method: 'GET', path: '/api/performance/analytics', requiresAuth: false },
  ],
  
  // Compliance
  compliance: [
    { method: 'GET', path: '/api/compliance/dashboard', requiresAuth: false },
    { method: 'GET', path: '/api/compliance/alerts', requiresAuth: false },
    { method: 'GET', path: '/api/compliance/trainings', requiresAuth: false },
  ],
  
  // Payroll
  payroll: [
    { method: 'GET', path: '/api/payroll/periods', requiresAuth: false },
    { method: 'GET', path: '/api/payroll/calculations', requiresAuth: false },
    { method: 'GET', path: '/api/payroll/commission-structures', requiresAuth: false },
    { method: 'GET', path: '/api/payroll/bonus-structures', requiresAuth: false },
  ],
  
  // Bonuses - Requires admin/manager role OR salesRole (agent/manager)
  bonuses: [
    { method: 'GET', path: '/api/bonuses', requiresAuth: true, note: 'admin/manager/salesRole only, own-only for salesRole' },
    { method: 'POST', path: '/api/bonuses', requiresAuth: true, note: 'admin/manager only' },
    { method: 'PUT', path: '/api/bonuses/:id', requiresAuth: true, note: 'admin/manager only' },
    { method: 'GET', path: '/api/bonuses/structures', requiresAuth: true, note: 'admin/manager/salesRole only' },
    { method: 'POST', path: '/api/bonuses/structures', requiresAuth: true, note: 'admin/manager only' },
    { method: 'GET', path: '/api/bonuses/commission-structures', requiresAuth: true, note: 'admin/manager/salesRole only' },
    { method: 'POST', path: '/api/bonuses/commission-structures', requiresAuth: true, note: 'admin/manager only' },
  ],
  
  // Recruiting
  recruiting: [
    { method: 'GET', path: '/api/recruiting/job-postings', requiresAuth: false },
    { method: 'GET', path: '/api/recruiting/candidates', requiresAuth: false },
    { method: 'GET', path: '/api/recruiting/applications', requiresAuth: false },
    { method: 'GET', path: '/api/recruiting/interviews', requiresAuth: false },
    { method: 'POST', path: '/api/recruiting/job-postings', requiresAuth: true },
    { method: 'POST', path: '/api/recruiting/candidates', requiresAuth: true },
    { method: 'POST', path: '/api/recruiting/interviews', requiresAuth: true },
    { method: 'PUT', path: '/api/recruiting/candidates/:id/status', requiresAuth: true },
    { method: 'GET', path: '/api/recruiting/analytics', requiresAuth: false },
  ],
  
  // Benefits
  benefits: [
    { method: 'GET', path: '/api/benefits/plans', requiresAuth: false },
    { method: 'GET', path: '/api/benefits/enrollments', requiresAuth: false },
    { method: 'GET', path: '/api/benefits/retirement-plans', requiresAuth: false },
    { method: 'GET', path: '/api/benefits/insurance-plans', requiresAuth: false },
    { method: 'POST', path: '/api/benefits/plans', requiresAuth: true },
    { method: 'POST', path: '/api/benefits/enrollments', requiresAuth: true },
    { method: 'PUT', path: '/api/benefits/retirement-plans/:id/manage', requiresAuth: true },
    { method: 'GET', path: '/api/benefits/analytics', requiresAuth: false },
  ],
  
  // Termination
  termination: [
    { method: 'GET', path: '/api/termination/checklist-template', requiresAuth: false },
    { method: 'GET', path: '/api/termination/list', requiresAuth: false },
    { method: 'POST', path: '/api/termination/details', requiresAuth: true },
  ],
  
  // Timecards
  timecards: [
    { method: 'GET', path: '/api/timecards', requiresAuth: true },
    { method: 'POST', path: '/api/timecards', requiresAuth: true },
  ],
  
  // Analytics
  analytics: [
    { method: 'GET', path: '/api/analytics/dashboard', requiresAuth: true },
  ],
  
  // Health
  health: [
    { method: 'GET', path: '/api/health/health', requiresAuth: false },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70) + '\n');
}

async function testEndpoint(method, path, requiresAuth) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (sessionCookie && requiresAuth) {
    headers['Cookie'] = sessionCookie;
  }
  
  // Replace :id placeholders with 1 for testing
  const testPath = path.replace(/:id/g, '1').replace(/:key/g, 'test_key');
  
  try {
    const response = await fetch(`${API_BASE}${testPath}`, {
      method: method === 'GET' ? 'GET' : method,
      headers,
      // Don't send body for GET requests
      body: method !== 'GET' ? JSON.stringify({}) : undefined
    });
    
    results.total++;
    
    const result = {
      method,
      path,
      status: response.status,
      requiresAuth,
      accessible: false,
      authRequired: false,
      error: null
    };
    
    if (response.status === 404) {
      results.missing++;
      result.error = 'Not Found';
      log('❌', `${method} ${path} → 404 NOT FOUND`);
    } else if (response.status === 401 || response.status === 403) {
      results.authenticated++;
      result.authRequired = true;
      log('🔐', `${method} ${path} → ${response.status} AUTH REQUIRED`);
    } else if (response.status >= 200 && response.status < 300) {
      results.accessible++;
      result.accessible = true;
      log('✅', `${method} ${path} → ${response.status} OK`);
    } else if (response.status >= 400 && response.status < 500) {
      results.accessible++; // Endpoint exists, just bad request
      result.accessible = true;
      log('⚠️', `${method} ${path} → ${response.status} CLIENT ERROR (endpoint exists)`);
    } else {
      results.error++;
      result.error = `Server Error ${response.status}`;
      log('💥', `${method} ${path} → ${response.status} SERVER ERROR`);
    }
    
    results.endpoints.push(result);
    return result;
    
  } catch (error) {
    results.total++;
    results.error++;
    
    const result = {
      method,
      path,
      status: 0,
      requiresAuth,
      accessible: false,
      error: error.message
    };
    
    results.endpoints.push(result);
    log('💥', `${method} ${path} → ERROR: ${error.message}`);
    return result;
  }
}

async function authenticate() {
  log('🔑', 'Attempting authentication...');
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
        log('✅', 'Authenticated successfully');
        return true;
      }
    }
    
    log('⚠️', 'Authentication failed - testing public endpoints only');
    return false;
  } catch (error) {
    log('❌', `Authentication error: ${error.message}`);
    return false;
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runCoverageTest() {
  console.log('\n');
  log('🚀', 'API Endpoint Coverage Test');
  log('📅', `Date: ${new Date().toISOString()}`);
  log('🌐', `API Base: ${API_BASE}`);
  
  // Authenticate
  logSection('🔐 Authentication');
  await authenticate();
  
  // Test all endpoints by category
  for (const [category, endpoints] of Object.entries(ENDPOINTS)) {
    logSection(`📁 ${category.toUpperCase()} Endpoints`);
    
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint.method, endpoint.path, endpoint.requiresAuth);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Generate report
  logSection('📊 COVERAGE REPORT');
  
  console.log(`Total Endpoints Tested:     ${results.total}`);
  console.log(`✅ Accessible:              ${results.accessible}`);
  console.log(`🔐 Authentication Required: ${results.authenticated}`);
  console.log(`❌ Not Found (404):         ${results.missing}`);
  console.log(`💥 Errors:                  ${results.error}`);
  
  const coveragePercent = ((results.accessible / results.total) * 100).toFixed(1);
  console.log(`\n📈 Coverage: ${coveragePercent}%`);
  
  // Missing endpoints
  const missing = results.endpoints.filter(e => e.status === 404);
  if (missing.length > 0) {
    console.log('\n❌ MISSING ENDPOINTS:');
    missing.forEach(e => {
      console.log(`   ${e.method} ${e.path}`);
    });
  }
  
  // Error endpoints
  const errors = results.endpoints.filter(e => e.error && e.status !== 404);
  if (errors.length > 0) {
    console.log('\n💥 ENDPOINTS WITH ERRORS:');
    errors.forEach(e => {
      console.log(`   ${e.method} ${e.path} - ${e.error}`);
    });
  }
  
  // Summary by category
  console.log('\n📊 COVERAGE BY CATEGORY:');
  for (const [category, endpoints] of Object.entries(ENDPOINTS)) {
    const categoryResults = results.endpoints.filter(e => 
      endpoints.some(ep => ep.path === e.path && ep.method === e.method)
    );
    const accessible = categoryResults.filter(e => e.accessible || e.authRequired).length;
    const total = categoryResults.length;
    const percent = ((accessible / total) * 100).toFixed(0);
    
    console.log(`   ${category.padEnd(20)} ${accessible}/${total} (${percent}%)`);
  }
  
  console.log('\n');
  
  if (results.missing === 0 && results.error === 0) {
    log('🎉', 'PERFECT COVERAGE - ALL ENDPOINTS ACCESSIBLE!');
    process.exit(0);
  } else if (results.missing > 0) {
    log('⚠️', `${results.missing} endpoints are missing (404)`);
    process.exit(1);
  } else {
    log('⚠️', 'Some endpoints have errors - check logs above');
    process.exit(1);
  }
}

// Run the coverage test
runCoverageTest().catch((error) => {
  console.error('💥 Coverage test crashed:', error);
  process.exit(1);
});

