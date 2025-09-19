// Simple API test
const API_BASE = 'https://api-hr.onrender.com';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');
  
  const tests = [
    {
      name: 'Root endpoint',
      url: '/',
      method: 'GET'
    },
    {
      name: 'Health check',
      url: '/health',
      method: 'GET'
    },
    {
      name: 'Payroll submissions',
      url: '/api/payroll/submissions',
      method: 'GET'
    },
    {
      name: 'Payroll calculations',
      url: '/api/payroll/calculations',
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await fetch(`${API_BASE}${test.url}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  OK: ${response.ok}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        const text = await response.text();
        console.log(`  Error: ${text.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

testAPI().catch(console.error);
