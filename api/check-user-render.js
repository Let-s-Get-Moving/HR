import fetch from 'node-fetch';

const API_URL = 'https://hr-api-wbzs.onrender.com';

async function checkUser() {
  try {
    console.log('🔍 Checking employees on Render...\n');
    
    // Get all employees
    const empResponse = await fetch(`${API_URL}/api/employees`);
    const employees = await empResponse.json();
    
    console.log(`Found ${employees.length} employees`);
    
    // Find test user
    const testEmployee = employees.find(e => 
      (e.first_name && e.first_name.toLowerCase().includes('test')) || 
      (e.last_name && e.last_name.toLowerCase().includes('test'))
    );
    
    if (testEmployee) {
      console.log('\n✅ Found test employee:');
      console.log(JSON.stringify(testEmployee, null, 2));
    } else {
      console.log('\n❌ No test employee found');
      console.log('\nAll employees:');
      employees.forEach(e => console.log(`  - ${e.first_name} ${e.last_name} (ID: ${e.id})`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUser();
