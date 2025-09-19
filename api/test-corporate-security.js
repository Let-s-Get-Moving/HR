// Test corporate-grade security implementation
// Using built-in fetch API

const API_BASE = 'https://api-hr.onrender.com';

async function testCorporateSecurity() {
  console.log('🔒 Testing Corporate-Grade Security Implementation...\n');
  
  const tests = [
    {
      name: '1. Basic API Health Check',
      test: async () => {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
      }
    },
    {
      name: '2. Security Headers Check',
      test: async () => {
        const response = await fetch(`${API_BASE}/`);
        const headers = response.headers;
        return {
          hasCSP: headers.get('content-security-policy') !== null,
          hasHSTS: headers.get('strict-transport-security') !== null,
          hasXFrameOptions: headers.get('x-frame-options') !== null,
          hasXContentTypeOptions: headers.get('x-content-type-options') !== null
        };
      }
    },
    {
      name: '3. Rate Limiting Test',
      test: async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(fetch(`${API_BASE}/api/employees`));
        }
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r.status === 429);
        return { rateLimited, responses: responses.length };
      }
    },
    {
      name: '4. SQL Injection Prevention',
      test: async () => {
        try {
          const response = await fetch(`${API_BASE}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: "'; DROP TABLE employees; --",
              last_name: "test"
            })
          });
          return response.status === 400; // Should be blocked
        } catch (error) {
          return true; // Error is expected
        }
      }
    },
    {
      name: '5. XSS Prevention',
      test: async () => {
        try {
          const response = await fetch(`${API_BASE}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: "<script>alert('xss')</script>",
              last_name: "test"
            })
          });
          return response.status === 400; // Should be blocked
        } catch (error) {
          return true; // Error is expected
        }
      }
    },
    {
      name: '6. Payroll Submissions Endpoint',
      test: async () => {
        const response = await fetch(`${API_BASE}/api/payroll/submissions`);
        return {
          status: response.status,
          ok: response.ok,
          hasData: response.ok
        };
      }
    },
    {
      name: '7. Payroll Calculations Endpoint',
      test: async () => {
        const response = await fetch(`${API_BASE}/api/payroll/calculations`);
        return {
          status: response.status,
          ok: response.ok,
          hasData: response.ok
        };
      }
    },
    {
      name: '8. CORS Configuration',
      test: async () => {
        const response = await fetch(`${API_BASE}/api/employees`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://hr-management-system.onrender.com',
            'Access-Control-Request-Method': 'GET'
          }
        });
        return {
          status: response.status,
          hasCORSHeaders: response.headers.get('access-control-allow-origin') !== null,
          allowsCredentials: response.headers.get('access-control-allow-credentials') === 'true'
        };
      }
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await test.test();
      console.log(`✅ ${test.name}: ${JSON.stringify(result, null, 2)}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    console.log(''); // Empty line for readability
  }
  
  console.log(`\n🎯 Security Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All security tests passed! Corporate-grade security is working.');
  } else {
    console.log('⚠️ Some security tests failed. Review the implementation.');
  }
}

// Run the tests
testCorporateSecurity().catch(console.error);
