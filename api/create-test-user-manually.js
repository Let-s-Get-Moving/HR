import fetch from 'node-fetch';

const API_URL = 'https://hr-api-wbzs.onrender.com';

async function createTestUser() {
  try {
    console.log('🔐 Creating user account for "test test" employee...\n');
    
    const response = await fetch(`${API_URL}/api/auth/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to provide your session ID
      },
      body: JSON.stringify({
        username: 'testtest',
        password: 'password123',
        full_name: 'test test',
        email: 'test@letsgetmovinggroup.com',
        role: 'user',
        employee_id: 539
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ User account created successfully!');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n📋 Login Credentials:');
      console.log('Username: testtest');
      console.log('Password: password123');
      console.log('Role: user');
    } else {
      console.log('❌ Failed to create user account:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestUser();

